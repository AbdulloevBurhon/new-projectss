<script setup lang="ts">
import Pagination from './Pagination.vue'

interface TableColumn { key: string; label: string }

const props = withDefaults(defineProps<{
  columns: TableColumn[]
  rows: object[]
  rowKey?: string
  emptyText?: string
}>(), {
  rowKey: 'id',
  emptyText: 'Нет данных для отображения.',
})

const page = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10, 30, 100]
const pageCount = computed(() => Math.max(1, Math.ceil(props.rows.length / pageSize.value)))
const visibleRows = computed(() => props.rows.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))

watch(() => props.rows.length, () => { page.value = Math.min(page.value, pageCount.value) })

function cellValue(row: object, key: string) {
  return (row as Record<string, unknown>)[key]
}

function rowId(row: object, index: number) {
  return String(cellValue(row, props.rowKey) ?? index)
}
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white">
    <div class="overflow-x-auto rounded-t-xl">
      <table class="w-full border-collapse text-left text-sm">
        <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th v-for="column in columns" :key="column.key" class="px-4 py-3 font-semibold">{{ column.label }}</th></tr></thead>
        <tbody v-if="visibleRows.length">
          <tr v-for="(row, rowIndex) in visibleRows" :key="rowId(row, rowIndex)" class="border-t border-slate-100 align-top">
            <td v-for="column in columns" :key="column.key" class="px-4 py-2.5">
              <slot :name="`cell-${column.key}`" :row="row" :value="cellValue(row, column.key)">{{ cellValue(row, column.key) ?? '—' }}</slot>
            </td>
          </tr>
        </tbody>
        <tbody v-else><tr><td :colspan="columns.length" class="px-4 py-10 text-center text-sm text-slate-500">{{ emptyText }}</td></tr></tbody>
      </table>
    </div>
    <Pagination v-model="page" v-model:page-size="pageSize" :total-items="rows.length" :page-size-options="pageSizeOptions" />
  </div>
</template>
