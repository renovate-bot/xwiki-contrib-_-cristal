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
import CConnectionStatus from "./c-connection-status.vue";
import CSaveStatus from "./c-save-status.vue";
import CTiptapBubbleMenu from "./c-tiptap-bubble-menu.vue";
import { computeCurrentUser } from "./compute-current-user";
import { initOnQuitHelper } from "./on-quit-helper";
import { loadLinkSuggest } from "../components/extensions/link-suggest";
import { Slash } from "../components/extensions/slash";
import { CollaborationKit, User } from "../extensions/collaboration";
import initLinkExtension from "../extensions/link";
import initMarkdown from "../extensions/markdown";
import messages from "../translations";
import Placeholder from "@tiptap/extension-placeholder";
import Table from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import StarterKit from "@tiptap/starter-kit";
import { Editor, EditorContent } from "@tiptap/vue-3";
import { CristalApp, PageData } from "@xwiki/cristal-api";
import { AuthenticationManagerProvider } from "@xwiki/cristal-authentication-api";
import { BrowserApi } from "@xwiki/cristal-browser-api";
import { name as documentServiceName } from "@xwiki/cristal-document-api";
import {
  ModelReferenceHandlerProvider,
  ModelReferenceParserProvider,
  ModelReferenceSerializer,
  ModelReferenceSerializerProvider,
} from "@xwiki/cristal-model-reference-api";
import {
  RemoteURLParser,
  RemoteURLParserProvider,
  RemoteURLSerializerProvider,
} from "@xwiki/cristal-model-remote-url-api";
import { CArticle } from "@xwiki/cristal-skin";
import {
  ImageInsertNode,
  initTiptapImage,
} from "@xwiki/cristal-tiptap-extension-image";
import { Container } from "inversify";
import { debounce } from "lodash-es";
import GlobalDragHandle from "tiptap-extension-global-drag-handle";
import { inject, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { AlertsService } from "@xwiki/cristal-alerts-api";
import type { StorageProvider } from "@xwiki/cristal-backend-api";
import type { DocumentService } from "@xwiki/cristal-document-api";
import type {
  LinkSuggestService,
  LinkSuggestServiceProvider,
} from "@xwiki/cristal-link-suggest-api";
import type { DocumentReference } from "@xwiki/cristal-model-api";
import type { Markdown } from "tiptap-markdown";
import type { Ref } from "vue";

const { t } = useI18n({
  messages,
});

const cristal = inject<CristalApp>("cristal")!;

const container = cristal.getContainer();
const documentService = container.get<DocumentService>(documentServiceName);
const authenticationManager = container
  .get<AuthenticationManagerProvider>("AuthenticationManagerProvider")
  .get();
const modelReferenceHandler = container
  .get<ModelReferenceHandlerProvider>("ModelReferenceHandlerProvider")
  .get();
const storage = container.get<StorageProvider>("StorageProvider").get();
const browserApi = container.get<BrowserApi>("BrowserApi");
const alertsService = cristal
  .getContainer()
  .get<AlertsService>("AlertsService")!;
const loading = documentService.isLoading();
const error: Ref<Error | undefined> = documentService.getError();
const currentPage: Ref<PageData | undefined> =
  documentService.getCurrentDocument();
const currentPageReference: Ref<DocumentReference | undefined> =
  documentService.getCurrentDocumentReference();

// TODO: load this content first, then initialize the editor.
// Make the loading status first.
const content = ref("");
const title = ref("");
const titlePlaceholder = modelReferenceHandler?.getTitle(
  currentPageReference.value!,
);

const hasRealtime = cristal.getWikiConfig().realtimeURL != undefined;

const currentPageName: Ref<string | undefined> =
  documentService.getCurrentDocumentReferenceString();

const viewRouterParams = {
  name: "view",
  params: { page: currentPageName.value ?? "" },
};
let editor: Ref<Editor | undefined> = ref(undefined);

const view = () => {
  // Destroy the editor instance.
  editor.value?.destroy();
  // Navigate to view mode.
  cristal?.getRouter().push(viewRouterParams);
};

// init last save content with the initial editor value.
const { update } = initOnQuitHelper(
  getEditorMarkdown,
  cristal.getRouter(),
  browserApi,
);

const updateOnQuitContent: () => void = update;

function getEditorMarkdown() {
  return editor?.value?.storage.markdown.getMarkdown();
}

let lastSaveSucceeded = true;

const save = async () => {
  try {
    // TODO: html does not make any sense here.
    await storage.save(
      currentPageName.value ?? "",
      title.value,
      getEditorMarkdown(),
      "html",
    );
    // Update the on quit content with the last successfully saved content.
    updateOnQuitContent();
    lastSaveSucceeded = true;
  } catch (e) {
    lastSaveSucceeded = false;
    console.error(e);
    alertsService.error(t("tiptap.editor.save.error"));
  }

  documentService.notifyDocumentChange("update", currentPageReference.value!);
};

const submit = async () => {
  if (!hasRealtime) {
    await save();
  } else {
    await editor.value?.storage.cristalCollaborationKit.autoSaver.save();
  }
  let goToView = true;
  if (!lastSaveSucceeded) {
    goToView = confirm(t("tiptap.editor.onquit.message"));
  }
  if (goToView) {
    view();
  }
};

let currentUser: undefined | User = undefined;

const debounced = debounce(() => {
  save();
}, 500);

async function editorInit(
  container: Container,
  linkSuggest: LinkSuggestService | undefined,
  MarkdownExtension: typeof Markdown,
  realtimeURL: string | undefined,
  serializer: ModelReferenceSerializer,
  parser: RemoteURLParser,
) {
  currentUser = await computeCurrentUser(authenticationManager);
  const realtimeExtension = [];
  if (hasRealtime) {
    realtimeExtension.push(
      CollaborationKit.configure({
        channel: currentPageName.value,
        user: currentUser,
        saveCallback: save,
        baseUrl: realtimeURL,
      }),
    );
  }
  return new Editor({
    content: content.value || "",
    extensions: [
      GlobalDragHandle,
      StarterKit.configure({
        // Disable the default history in order to use Collaboration's history management so that users undo / redo
        // only their own changes.
        history: false,
      }),
      Placeholder.configure({
        placeholder: "Type '/' to show the available actions",
      }),
      ImageInsertNode,
      initTiptapImage(serializer, parser).configure({ inline: true }),
      Table,
      TableRow,
      TableHeader,
      TableCell,
      Slash,
      // TODO: I did it that way for simplicity but this should really be
      // moved to an actual inversify component.
      loadLinkSuggest(cristal.getSkinManager(), container, linkSuggest),
      MarkdownExtension.configure({
        html: true,
      }),
      initLinkExtension(serializer, parser).configure({
        openOnClick: "whenNotEditable",
        // TODO: the protocols should be injected by extension.
        protocols: ["http", "https", "cristalfs"],
      }),
      ...realtimeExtension,
    ],
    onUpdate() {
      if (!hasRealtime) {
        debounced();
      }
    },
  });
}

function loadComponentsFromLoadEditor() {
  const linkSuggest = container
    .get<LinkSuggestServiceProvider>("LinkSuggestServiceProvider")
    .get();
  const modelReferenceParser = container
    .get<ModelReferenceParserProvider>("ModelReferenceParserProvider")
    .get()!;
  const remoteURLSerialize = container
    .get<RemoteURLSerializerProvider>("RemoteURLSerializerProvider")
    .get()!;
  const remoteURLParser = container
    .get<RemoteURLParserProvider>("RemoteURLParserProvider")
    .get()!;
  const modelReferenceSerializer = container
    .get<ModelReferenceSerializerProvider>("ModelReferenceSerializerProvider")
    .get()!;
  return {
    container,
    linkSuggest,
    modelReferenceParser,
    remoteURLSerialize,
    remoteURLParser,
    modelReferenceSerializer,
  };
}

async function loadEditor(page: PageData | undefined) {
  // Push the content to the document.
  // TODO: move to a components based implementation
  if (!editor.value) {
    content.value =
      page?.syntax == "markdown/1.2" ? page?.source : page?.html || "";
    title.value = documentService.getTitle().value ?? "";
    const {
      container,
      linkSuggest,
      modelReferenceParser,
      remoteURLSerialize,
      remoteURLParser,
      modelReferenceSerializer,
    } = loadComponentsFromLoadEditor();

    const realtimeURL = cristal.getWikiConfig().realtimeURL;

    const MarkdownExtension = initMarkdown(
      modelReferenceParser,
      remoteURLSerialize,
    );

    editor.value = await editorInit(
      container,
      linkSuggest,
      MarkdownExtension,
      realtimeURL,
      modelReferenceSerializer,
      remoteURLParser,
    );

    update();
  }
}

watch(
  loading,
  (newLoading) => {
    if (!newLoading) {
      loadEditor(currentPage.value);
    }
  },
  { immediate: true },
);

// Trigger a save whenever the title is edited.
// Otherwise, the title will not be updated unless the content is updated too.
watch(
  title,
  debounce(async () => {
    if (hasRealtime) {
      return await editor.value?.storage.cristalCollaborationKit.autoSaver.save(
        [
          {
            name: currentUser!.name,
          },
        ],
      );
    }
  }, 500),
);
</script>

<template>
  <c-article
    :loading="loading"
    :error="error"
    :current-page="currentPage"
    :current-page-reference="currentPageReference"
    :page-exist="true"
    before-u-i-x-p-id="edit.before"
    after-u-i-x-p-id="edit.after"
  >
    <template #title>
      <input
        v-model="title"
        type="text"
        :placeholder="titlePlaceholder"
        class="doc-title"
      />
    </template>
    <template #default>
      <c-tiptap-bubble-menu v-if="editor" :editor="editor" />
      <editor-content :editor="editor" class="doc-content editor" />
      <form class="pagemenu" @submit="submit">
        <div class="pagemenu-status">
          <c-connection-status
            v-if="editor && hasRealtime"
            :provider="editor.storage.cristalCollaborationKit.provider"
          ></c-connection-status>
          <c-save-status
            v-if="editor && hasRealtime"
            :auto-saver="editor.storage.cristalCollaborationKit.autoSaver"
          ></c-save-status>
        </div>
        <div class="pagemenu-actions">
          <x-btn size="small" variant="primary" @click="submit">Close</x-btn>
        </div>
      </form>
    </template>
  </c-article>
</template>

<style scoped>
.pagemenu {
  position: sticky;
  bottom: 0;
  display: flex;
  flex-flow: row;
  gap: var(--cr-spacing-x-small);
  padding: var(--cr-spacing-x-small) var(--cr-spacing-x-small);
  background: var(--cr-color-neutral-100);
  width: var(--cr-spacing-max-page);
  margin: var(--cr-spacing-x-small) auto;
  border-radius: var(--cr-input-border-radius-medium);
  max-width: var(--cr-sizes-max-page-width);
  width: 100%;
}

.pagemenu-status {
  /* The content of this section may be a mix of inline and block level elements. */
  display: flex;
  /* Push the actions to the right end of the menu. */
  flex-grow: 1;
}

.pagemenu-status > * {
  /* Match the action button padding, which seems to be hard-coded.  */
  padding: 0 12px;
}

:deep(.ProseMirror-menubar) {
  border-radius: var(--cr-input-border-radius-medium);
  border-bottom: none;
  padding: var(--cr-spacing-x-small) var(--cr-spacing-x-small);
  background: var(--cr-color-neutral-100);
}

:deep(.ProseMirror-selectednode:has(.image-container)) {
  display: inline-block;
}

:deep(.ProseMirror) {
  outline: none;
  max-width: var(--cr-sizes-max-page-width);
  width: 100%;
}

/*
TODO: should be moved to a css specific to the empty line placeholder plugin.
 */
.editor :deep(.placeholder):before {
  display: block;
  pointer-events: none;
  height: 0;
  content: attr(data-empty-text);
}

:deep(.is-empty:before) {
  pointer-events: none;
  float: left;
  height: 0;
  width: 100%;
  color: var(--cr-color-neutral-500);
  content: attr(data-placeholder);
}

:deep(.editor table td),
:deep(.editor table th) {
  border: 1px solid var(--cr-color-neutral-300);
}

/*
 * Collaboration styles.
 *
 * TODO: Should we move these styles to a custom TipTap (collaboration) extension?
 */

/* Show where remote users are typing. */
.editor :deep(.collaboration-cursor__caret) {
  border-left: 1px solid var(--cr-input-border-color);
  border-right: 1px solid var(--cr-input-border-color);
  margin-left: -1px;
  margin-right: -1px;
  pointer-events: none;
  position: relative;
  word-break: normal;
}

/* Render the remote user name above the associated caret. */
.editor :deep(.collaboration-cursor__label) {
  border-radius: var(--cr-border-radius-large) var(--cr-border-radius-large)
    var(--cr-border-radius-large) 0;
  color: var(--cr-input-color);
  /* The cursor label is injected in the edited content, read-only, so it inherits the content styles. We want the
    cursor label to have the same styles no matter where the caret is placed inside the edited content (e.g. in a level
    one heading versus a paragraph). */
  font-size: 12px;
  font-style: normal;
  /* Improves the contrast with the background color. */
  font-weight: var(--cr-font-weight-bold);
  left: -1px;
  /* We need to know the height in order to be able to place the cursor label just above the caret. */
  line-height: 1;
  padding: 4px 6px;
  position: absolute;
  top: -20px;
  user-select: none;
  white-space: nowrap;
}

/* Drag handle specific CSS */
.editor :deep(.drag-handle) {
  position: fixed;
  opacity: 1;
  transition: opacity ease-in 0.2s;
  border-radius: 0.25rem;

  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10' style='fill: rgba(0, 0, 0, 0.5)'%3E%3Cpath d='M3,2 C2.44771525,2 2,1.55228475 2,1 C2,0.44771525 2.44771525,0 3,0 C3.55228475,0 4,0.44771525 4,1 C4,1.55228475 3.55228475,2 3,2 Z M3,6 C2.44771525,6 2,5.55228475 2,5 C2,4.44771525 2.44771525,4 3,4 C3.55228475,4 4,4.44771525 4,5 C4,5.55228475 3.55228475,6 3,6 Z M3,10 C2.44771525,10 2,9.55228475 2,9 C2,8.44771525 2.44771525,8 3,8 C3.55228475,8 4,8.44771525 4,9 C4,9.55228475 3.55228475,10 3,10 Z M7,2 C6.44771525,2 6,1.55228475 6,1 C6,0.44771525 6.44771525,0 7,0 C7.55228475,0 8,0.44771525 8,1 C8,1.55228475 7.55228475,2 7,2 Z M7,6 C6.44771525,6 6,5.55228475 6,5 C6,4.44771525 6.44771525,4 7,4 C7.55228475,4 8,4.44771525 8,5 C8,5.55228475 7.55228475,6 7,6 Z M7,10 C6.44771525,10 6,9.55228475 6,9 C6,8.44771525 6.44771525,8 7,8 C7.55228475,8 8,8.44771525 8,9 C8,9.55228475 7.55228475,10 7,10 Z'%3E%3C/path%3E%3C/svg%3E");
  background-size: calc(0.5em + 0.375rem) calc(0.5em + 0.375rem);
  background-repeat: no-repeat;
  background-position: center;
  width: 1.2rem;
  height: 1.5rem;
  z-index: 50;
  cursor: grab;
}

/* Allow to disable drag handle for a sub-part of the dom. */
.edit :deep(.no-drag-handle .drag-handle) {
  display: none;
}

.editor :deep(.drag-handle:active) {
  cursor: grabbing;
}

.editor :deep(.drag-handle.hide) {
  opacity: 0;
  pointer-events: none;
}
</style>
