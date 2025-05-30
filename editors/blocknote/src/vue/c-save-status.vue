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
<script lang="ts">
export enum SaveStatus {
  UNSAVED = "UNSAVED",
  SAVING = "SAVING",
  SAVED = "SAVED",
}
</script>

<script setup lang="ts">
import { CIcon, Size } from "@xwiki/cristal-icons";
import { computed } from "vue";

const { saveStatus } = defineProps<{ saveStatus: SaveStatus }>();

interface StatusInfo {
  id: string;
  label: string;
  icon: string;
}

const statuses: Record<SaveStatus, StatusInfo> = {
  [SaveStatus.UNSAVED]: {
    id: "unsaved",
    label: "Unsaved",
    icon: "cloud",
  },

  [SaveStatus.SAVING]: {
    id: "saving",
    label: "Saving",
    icon: "arrow-clockwise",
  },

  [SaveStatus.SAVED]: {
    id: "saved",
    label: "Saved",
    icon: "cloud-check",
  },
};

const status = computed(() => statuses[saveStatus]);
</script>

<template>
  <span v-if="saveStatus" :class="`save-status save-status-${status.id}`">
    <c-icon :name="status.icon" :size="Size.Small" class="save-status-icon" />
    <span class="save-status-label">{{ status.label }}</span>
  </span>
</template>

<style scoped>
.save-status-icon + .save-status-label {
  margin-left: 0.2em;
}

.save-status-label {
  font-size: smaller;
}

.save-status-saving .save-status-icon:before {
  animation: 1.2s linear infinite cr-spin;
}
@keyframes cr-spin {
  0% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(90deg);
  }
  50% {
    transform: rotate(180deg);
  }
  75% {
    transform: rotate(270deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
