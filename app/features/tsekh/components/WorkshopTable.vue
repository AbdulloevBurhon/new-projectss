<script setup lang="ts" generic="T">
import SharedTable from '~/shared/table/Table.vue'

defineProps<{ rows: readonly T[]; resetKey?: string; tableClass?: string }>()
defineSlots<{ default(props: { pageRows: T[] }): unknown; empty?(): unknown }>()
</script>

<template>
  <SharedTable :rows="rows" :reset-key="resetKey" :table-class="`inventory-table ${tableClass || ''}`" container-class="workshop-table" scroll-class="workshop-table-scroll" :initial-page-size="5" :page-sizes="[5, 10, 50, 100]">
    <template #default="{ pageRows }"><slot :page-rows="pageRows" /></template>
    <template #empty><slot name="empty">Нет данных.</slot></template>
  </SharedTable>
</template>
