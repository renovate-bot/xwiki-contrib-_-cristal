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
<script lang="ts" setup>
import {
  computed,
  type ComputedRef,
  inject,
  onUpdated,
  ref,
  type Ref,
  watch,
} from "vue";
import { useRoute } from "vue-router";
import { type CristalApp, PageData } from "@xwiki/cristal-api";
import type {
  PageHierarchyItem,
  PageHierarchyResolverProvider,
} from "@xwiki/cristal-hierarchy-api";
import { marked } from "marked";
import { ContentTools } from "./contentTools";
import { CIcon, Size } from "@xwiki/cristal-icons";
import xavatarImg from "../images/no-one.svg";
import { ExtraTabs } from "@xwiki/cristal-extra-tabs-ui";
import { useI18n } from "vue-i18n";
import messages from "../translations";
import { InfoActions } from "@xwiki/cristal-info-actions-ui";

const { t } = useI18n({
  messages,
});

const route = useRoute();

const avImg = xavatarImg;

const loading = ref(false);
const error: Ref<Error | undefined> = ref(undefined);
const currentPage: Ref<PageData | undefined> = ref(undefined);
const currentPageName: ComputedRef<string> = computed(() => {
  // TODO: define a proper abstraction.
  return (
    (route.params.page as string) || cristal.getCurrentPage() || "Main.WebHome"
  );
});
const breadcrumbItems: Ref<Array<PageHierarchyItem>> = ref([]);

const breadcrumbRoot = ref(undefined);
const contentRoot = ref(undefined);

const content: ComputedRef<string | undefined> = computed(() => {
  if (currentPage.value) {
    const cpn: PageData = currentPage.value;
    if (cpn.html && cpn.html.trim() !== "") {
      return cpn.html as string;
    } else if (cpn.source) {
      // TODO: currently blindly convert the content to markdown.
      console.log("marked", marked, cpn.source);
      const parse = marked.parse(cpn.source);
      console.log("parse", parse);
      return parse as string;
    } else {
      return "";
    }
  } else {
    return undefined;
  }
});

const title = computed(() => {
  return (
    currentPage.value?.document?.get("headline") || currentPage.value?.name
  );
});

const cristal: CristalApp = inject<CristalApp>("cristal")!;

async function fetchPage(page: string) {
  loading.value = true;
  try {
    // Provides a reactive variable to be updated if the page content is updated
    // in the background.
    cristal.setContentRef(currentPage);
    currentPage.value = await cristal.getPage(page || currentPageName.value);
    breadcrumbItems.value = await cristal
      .getContainer()
      .get<PageHierarchyResolverProvider>("PageHierarchyResolverProvider")
      .get()
      .getPageHierarchy(currentPage.value!);
  } catch (e) {
    console.error(e);
    if (e instanceof Error) {
      error.value = e;
    }
  } finally {
    loading.value = false;
  }
}

watch(() => route.params.page as string, fetchPage, { immediate: true });

onUpdated(() => {
  ContentTools.transformImages(cristal, "xwikicontent");

  if (cristal && breadcrumbRoot.value) {
    ContentTools.listenToClicks(breadcrumbRoot.value, cristal);
  }

  if (cristal && contentRoot.value) {
    ContentTools.listenToClicks(contentRoot.value, cristal);
    ContentTools.transformMacros(contentRoot.value, cristal);
  }
});
</script>
<template>
  <div v-if="loading" class="content-loading">
    <!-- TODO: improve loading UI. -->
    <span class="load-spinner"></span>
    <h3>Loading</h3>
  </div>
  <div v-else-if="error" class="content-error">
    <!-- TODO: improve error reporting. -->
    {{ error }}
  </div>
  <article v-else id="content" ref="root" class="content">
    <UIX uixname="content.before" />

    <div class="page-header">
      <!-- This div lets us reference an actual HTML element,
             to be used in `ContentTools.listenToClicks()`. -->
      <div id="breadcrumbRoot" ref="breadcrumbRoot">
        <XBreadcrumb class="breadcrumb" :items="breadcrumbItems"></XBreadcrumb>
      </div>
      <x-btn circle size="small" variant="primary" color="primary">
        <c-icon
          class="new-page"
          name="plus"
          :label="t('page.actions.create.label')"
        ></c-icon>
      </x-btn>
    </div>

    <div class="doc-header">
      <h1 class="doc-title">{{ title }}</h1>
      <div class="doc-info">
        <span class="doc-info-user-info">
          <x-avatar class="avatar" :image="avImg" size="2rem"></x-avatar>
          User Name edited on 12/12/2024 at 12:00
        </span>
        <!-- TODO: add a way to inject those by extension
               and provide one for the number of attachments.
              It must be reactive whenever the attachment store is updated -->
        <div class="doc-info-actions">
          <suspense>
            <info-actions></info-actions>
          </suspense>
          <div class="doc-page-actions">
            <router-link
              :to="{
                name: 'edit',
                params: { page: currentPageName },
              }"
            >
              <x-btn size="small">
                <c-icon name="pencil" :size="Size.Small"></c-icon>
                Edit
              </x-btn>
            </router-link>
            <x-btn size="small">
              <c-icon name="three-dots-vertical" :size="Size.Small"></c-icon>
            </x-btn>
          </div>
        </div>
      </div>
    </div>

    <!-- eslint-disable vue/no-v-html -->
    <div
      v-if="content"
      id="xwikicontent"
      ref="contentRoot"
      class="doc-content"
      v-html="content"
    ></div>
    <div v-else class="unknown-page">
      The requested page could not be found. You can edit the page to create it.
    </div>
    <!-- The footer is not displayed in case of unknown page. -->
    <div v-if="content" class="doc-info-extra">
      <!-- Suspense is mandatory here as extra-tabs is asynchronous -->
      <suspense>
        <extra-tabs></extra-tabs>
      </suspense>
    </div>
    <UIX uixname="content.after" />
  </article>
</template>
<style scoped>
.content {
  padding: 0 var(--cr-spacing-2x-large);
}

.content-loading {
  display: flex;
  flex-flow: column;
  height: 100vh;
  align-items: center;
  justify-content: center;
}

/*TABLE STYLES*/
/*TODO: Check a better way to write these styles without the global tag. Currently impossible to use :deep because the html inside the document content is not assigned an ID */
.content {
  display: grid;
  grid-template-rows: 56px auto auto 1fr;
  overflow: auto;
  height: 100%;
}
:global(.doc-content table) {
  max-width: 100%;
  width: 100%;
  border: none;
  border-collapse: collapse;
  color: inherit;
  margin-bottom: var(--cr-spacing-small);
}

:global(.doc-content table tr) {
  border-bottom: solid 1px var(--cr-input-border-color);
}

:global(.doc-content table th) {
  font-weight: var(--cr-font-weight-bold);
  text-align: start;
}

:global(.doc-content table td),
:global(.doc-content table th) {
  line-height: var(--cr-line-height-normal);
  padding: 1rem 1rem;
}

:global(.doc-content table th p:first-child),
:global(.doc-content table td p:first-child) {
  margin-top: 0;
}

:global(.doc-content table th p:last-child),
:global(.doc-content table td p:last-child) {
  margin-bottom: 0;
}

/*---*/

.content-loading svg {
  width: 64px;
  height: 64px;
}

.content-loading h3 {
  padding: 0;
  margin: 0;
  color: var(--cr-color-neutral-500);
}

.edit-icon {
  font-size: 14px;
}

.new-page {
  display: block;
}

.doc-header {
  display: grid;
  grid-auto-flow: column;
  grid-template-columns: 1fr;
  grid-template-rows: auto auto;
  gap: 0px 0px;
  grid-template-areas:
    "title"
    "info-user";
  gap: var(--cr-spacing-x-small);
  padding: var(--cr-spacing-x-small) var(--cr-spacing-2x-large);
  top: 0;
  background: white;
  z-index: 1;
}

.doc-title {
  grid-area: title;
  margin: 0;
  font-size: var(--cr-font-size-2x-large);
  line-height: var(--cr-font-size-2x-large);
}

.doc-info {
  grid-area: info-user;
  display: flex;
  flex-flow: row;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--cr-spacing-small);
  color: var(--cr-color-neutral-500);
  font-size: var(--cr-font-size-small);
  justify-content: space-between;
}

.avatar {
  --size: 24px;
}

.doc-info-actions,
.doc-page-actions {
  display: flex;
  flex-wrap: wrap;
  flex-flow: row;
  align-items: center;
  gap: var(--cr-spacing-2x-small);
}

.doc-info-actions {
  margin-right: var(--cr-spacing-medium);
  justify-self: end;
}

.info-action {
  display: flex;
  background-color: var(--cr-color-neutral-100);
  border-radius: 99px;
  padding: var(--cr-spacing-2x-small) var(--cr-spacing-2x-small);
  font-size: var(--cr-font-size-medium);
  flex-flow: row;
  gap: var(--cr-spacing-2x-small);
  align-items: center;
}

.info-action .cr-icon {
  line-height: 1.3rem;
}

.page-header {
  padding: var(--cr-spacing-x-small) 0;
  display: flex;
  flex-wrap: wrap;
  gap: var(--cr-spacing-medium);
  align-items: center;
  flex-flow: row;
}

.inner-content {
  display: flex;
  flex-flow: column;
  flex-basis: auto;
  overflow: auto;
}

.doc-info-extra {
  &.floating {
    position: sticky;
    bottom: 0;
    background: white;
    box-shadow: var(--cr-shadow-small);
  }
}
</style>
