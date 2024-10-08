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
import { type Ref, onBeforeMount, onMounted, ref, watch } from "vue";
import "@shoelace-style/shoelace/dist/components/tree/tree";
import "@shoelace-style/shoelace/dist/components/tree-item/tree-item";
import type SlTree from "@shoelace-style/shoelace/dist/components/tree/tree";
import type SlTreeItem from "@shoelace-style/shoelace/dist/components/tree-item/tree-item";
import { type PageData } from "@xwiki/cristal-api";
import type {
  NavigationTreeNode,
  NavigationTreeSource,
} from "@xwiki/cristal-navigation-tree-api";

type OnClickAction = (node: NavigationTreeNode) => void;

const mutationObserver: MutationObserver = new MutationObserver(onMutation);

const rootNodes: Ref<Array<NavigationTreeNode>> = ref([]);
const tree: Ref<SlTree | undefined> = ref(undefined);
const treeItems: Ref<Map<string, SlTreeItem>> = ref(
  new Map<string, SlTreeItem>(),
);
var selectedTreeItem: SlTreeItem | undefined = undefined;

var expandedNodes: Array<string> = new Array<string>();
var expandNodes: boolean = false;

const props = defineProps<{
  treeSource: NavigationTreeSource;
  clickAction?: OnClickAction;
  currentPage?: PageData;
}>();

onBeforeMount(async () => {
  rootNodes.value.push(...(await props.treeSource.getChildNodes("")));
});

onMounted(() => mutationObserver.observe(tree.value!, { childList: true }));
watch(
  () => props.currentPage,
  () => {
    if (props.currentPage) {
      expandNodes = true;
      expandedNodes = props.treeSource.getParentNodesId(props.currentPage);
      expandTree();
    }
  },
  { immediate: true },
);
watch(treeItems, expandTree, { deep: true });

function expandTree() {
  if (expandNodes) {
    let i;
    for (i = 0; i < expandedNodes.length - 1; i++) {
      if (treeItems.value.has(expandedNodes[i])) {
        treeItems.value.get(expandedNodes[i])!.expanded = true;
      }
    }
    if (treeItems.value.has(expandedNodes[i])) {
      if (selectedTreeItem) {
        selectedTreeItem.selected = false;
      }
      treeItems.value.get(expandedNodes[i])!.selected = true;
      selectedTreeItem = treeItems.value.get(expandedNodes[i]);
      // If we have a custom click action, we want to use it on dynamic
      // selection.
      if (props.clickAction) {
        selectedTreeItem?.getElementsByTagName("a")[0].click();
      }
      expandNodes = false;
    }
  }
}

function onMutation(mutationList: Array<MutationRecord>) {
  for (const mutation of mutationList) {
    if (mutation.type === "childList") {
      mutation.addedNodes.forEach((node) => {
        const item = node as SlTreeItem;
        mutationObserver.observe(item, { childList: true });
        item.updateComplete.then(() => {
          treeItems.value.set(item.getAttribute("data-id")!, item);
        });
      });
    }
  }
}

function onSelectionChange(event: unknown) {
  selectedTreeItem = (event as { detail: { selection: SlTreeItem[] } }).detail
    .selection[0];
}

function lazyLoadChildren(id: string) {
  return async (event: Event) => {
    const lazyItem = event.target! as Element;
    const childNodes = await props.treeSource.getChildNodes(id);
    for (const child of childNodes) {
      const treeItem = document.createElement("sl-tree-item");
      const label = child.label
        .replace(/&/g, "&amp;")
        .replace(/>/g, "&gt;")
        .replace(/</g, "&lt;");
      treeItem.innerHTML = `<a href="${child.url}">${label}</a>`;
      if (props.clickAction) {
        treeItem
          .getElementsByTagName("a")[0]
          .addEventListener("click", (event) => {
            props.clickAction!(child);
            event.preventDefault();
          });
      }
      if (child.has_children) {
        treeItem.setAttribute("lazy", "true");
        treeItem.addEventListener("sl-lazy-load", lazyLoadChildren(child.id), {
          once: true,
        });
      }
      treeItem.setAttribute("data-id", child.id);
      lazyItem.append(treeItem);
    }

    // If the node doesn't have any children, we still need to add one item
    // temporarily to disable the loading state.
    if (childNodes.length == 0) {
      const treeItem = document.createElement("sl-tree-item");
      lazyItem.append(treeItem);
      treeItem.remove();
    }

    // Disable lazy mode once the content has been loaded
    lazyItem.removeAttribute("lazy");
  };
}
</script>

<template>
  <sl-tree ref="tree" @sl-selection-change="onSelectionChange($event)">
    <sl-tree-item
      v-for="item in rootNodes"
      :key="item.id"
      :lazy="item.has_children"
      :data-id="item.id"
      @sl-lazy-load.once="lazyLoadChildren(item.id)($event)"
    >
      <a
        v-if="props.clickAction"
        :href="item.url"
        @click.prevent="clickAction!(item)"
        >{{ item.label }}</a
      >
      <a v-else :href="item.url">{{ item.label }}</a>
    </sl-tree-item>
  </sl-tree>
</template>

<style scoped></style>
