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
import InfoAction from "./InfoAction.vue";
import { InfoActionsService } from "@xwiki/cristal-info-actions-api";
import { inject } from "vue";
import type { CristalApp } from "@xwiki/cristal-api";

const cristal = inject<CristalApp>("cristal")!;

const infoActionsService = cristal
  .getContainer()
  .get<InfoActionsService>("InfoActionsService");

const list = await infoActionsService.list();
</script>

<template>
  <div class="actions">
    <info-action
      v-for="infoAction in list"
      :key="infoAction.id"
      :info-action="infoAction"
    ></info-action>
  </div>
</template>

<style scoped>
.actions {
  display: flex;
  flex-wrap: wrap;
  flex-flow: row;
  align-items: center;
  gap: var(--cr-spacing-2x-small);
}
</style>
