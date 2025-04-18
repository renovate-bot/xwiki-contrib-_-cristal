<!--
See the LICENSE file distributed with this work for additional
information regarding copyright ownership.

This is free software; you can redistribute it and/or modify it
under the terms of the GNU Lesser General Public License as
published by the Free Software Foundation; either version 2.1 of
the License, or (at your option) any later version.

This software is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public
License along with this software; if not, write to the Free
Software Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
02110-1301 USA, or see the FSF site: http://www.fsf.org.
-->
<script setup lang="ts">
import ImageFilePanel from "./blocks/ImageFilePanel.vue";
import ImageToolbar from "./blocks/ImageToolbar.vue";
import LinkToolbar from "./blocks/LinkToolbar.vue";
import { UniAstToBlockNoteConverter } from "../blocknote/parser";
import { BlockNoteToUniAstConverter } from "../blocknote/serializer";
import { AutoSaver } from "../components/autoSaver";
import { computeCurrentUser } from "../components/currentUser";
import { createLinkEditionContext } from "../components/linkEditionContext";
import { autoSaverRef, providerRef } from "../components/realtimeState";
import {
  BlockNoteViewWrapper,
  BlockNoteViewWrapperProps,
} from "../react/BlockNoteView";
import { HocuspocusProvider } from "@hocuspocus/provider";
import {
  DocumentService,
  name as documentServiceName,
} from "@xwiki/cristal-document-api";
import {
  ReactNonSlotProps,
  reactComponentAdapter,
} from "@xwiki/cristal-reactivue";
import {
  UniAst,
  UniAstToMarkdownConverter,
  createConverterContext,
} from "@xwiki/cristal-uniast";
import { Container } from "inversify";

import { debounce } from "lodash-es";
import { watch } from "vue";
import { createI18n } from "vue-i18n";
import type { SkinManager } from "@xwiki/cristal-api";
import type { AuthenticationManagerProvider } from "@xwiki/cristal-authentication-api/dist";

const {
  editorProps,
  editorContent: uniAst,
  realtimeServerURL,
  container,
  skinManager,
} = defineProps<{
  editorProps: Omit<ReactNonSlotProps<BlockNoteViewWrapperProps>, "content">;
  editorContent: UniAst;
  realtimeServerURL?: string;
  container: Container;
  skinManager: SkinManager;
}>();

const emit = defineEmits<{
  // TODO: the type of the content might change!
  "blocknote-save": [content: string];
}>();

defineExpose({
  async getContent() {
    return extractEditorContent();
  },
});

async function extractEditorContent() {
  const editor = editorProps.editorRef!.value!;
  const uniAst = blockNoteToUniAst.blocksToUniAst(editor.document);
  return uniAstToMarkdown.toMarkdown(uniAst);
}

// eslint-disable-next-line max-statements
async function getRealtimeProvider(): Promise<
  NonNullable<BlockNoteViewWrapperProps["blockNoteOptions"]>["collaboration"]
> {
  const documentService = container.get<DocumentService>(documentServiceName);
  const authenticationManager = container
    .get<AuthenticationManagerProvider>("AuthenticationManagerProvider")
    .get()!;

  if (!realtimeServerURL) {
    return undefined;
  }

  const documentReference =
    documentService.getCurrentDocumentReferenceString().value;

  if (!documentReference) {
    throw new Error("Got no document reference!");
  }

  const provider = new HocuspocusProvider({
    url: realtimeServerURL,
    // we distinguish from sessions from other editors with a ':blocknote' suffix.
    name: `${documentReference}:blocknote`,
  });

  autoSaverRef.value = new AutoSaver(provider, async () => {
    const content = await extractEditorContent();

    if (content) {
      emit("blocknote-save", content);
    }
  });

  const user = await computeCurrentUser(authenticationManager);

  providerRef.value = provider;

  return {
    provider,
    fragment: provider.document.getXmlFragment("document-store"),
    user,
  };
}

const collaboration = await getRealtimeProvider();

if (!realtimeServerURL && editorProps.editorRef) {
  watch(editorProps.editorRef, (editor) => {
    if (editor) {
      const debouncedSave = debounce(async () => {
        const content = await extractEditorContent();
        if (content) {
          emit("blocknote-save", content);
        }
      }, 500);

      editor?.onChange(debouncedSave);
    }
  });
}

const initializedEditorProps = {
  ...editorProps,
  blockNoteOptions: {
    ...editorProps.blockNoteOptions,
    collaboration,
  },
};

const BlockNoteViewAdapter = reactComponentAdapter(BlockNoteViewWrapper, {
  modifyVueApp: (app) => {
    skinManager.loadDesignSystem(app, container);

    app.use(createI18n({ legacy: false, fallbackLocale: "en" }));

    app.provide("container", container);
  },
});

const linkEditionCtx = createLinkEditionContext(container);
const converterContext = createConverterContext(container);

const blockNoteToUniAst = new BlockNoteToUniAstConverter(converterContext);
const uniAstToMarkdown = new UniAstToMarkdownConverter();

const uniAstToBlockNote = new UniAstToBlockNoteConverter(converterContext);

const content = uniAstToBlockNote.uniAstToBlockNote(uniAst);
</script>

<template>
  <BlockNoteViewAdapter v-bind="initializedEditorProps" :content>
    <!-- Custom (popover) formatting toolbar -->
    <template #formattingToolbar="{ editor, currentBlock }">
      <ImageToolbar
        v-if="currentBlock.type === 'image'"
        :editor
        :current-block
      />

      <strong v-else>Unknown block type: {{ currentBlock.type }}</strong>
    </template>

    <!-- Custom (popover) toolbar for link edition -->
    <template #linkToolbar="{ editor, linkToolbarProps }">
      <LinkToolbar :editor :link-toolbar-props :link-edition-ctx />
    </template>

    <!-- Custom (popover) file panel for editing file-like blocks -->
    <template #filePanel="{ editor, filePanelProps }">
      <ImageFilePanel
        v-if="filePanelProps.block.type === 'image'"
        :editor
        :file-panel-props
        :link-edition-ctx
      />

      <strong v-else>
        Unexpected file type block: {{ filePanelProps.block.type }}
      </strong>
    </template>
  </BlockNoteViewAdapter>
</template>
