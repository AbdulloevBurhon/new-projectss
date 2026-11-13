<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../table'
import { TablePagination } from '../table-pagination'

type Column = { key: string; label: string; align?: 'left' | 'right'; class?: string }
const props = withDefaults(defineProps<{
  columns: Column[]
  rows: any[]
  rowKey?: string
  emptyText?: string
  pageSizeOptions?: number[]
}>(), {
  rowKey: 'id',
  emptyText: 'Нет данных для отображения',
  pageSizeOptions: () => [10, 25, 50],
})
const page = ref(1)
const pageSize = ref(props.pageSizeOptions[0] ?? 10)
const pageCount = computed(() => Math.max(1, Math.ceil(props.rows.length / pageSize.value)))
const visibleRows = computed(() => props.rows.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))
const firstIndex = computed(() => (page.value - 1) * pageSize.value)

watch(() => props.rows, () => { page.value = 1 })
watch(() => props.rows.length, () => { page.value = Math.min(page.value, pageCount.value) })
watch(() => props.pageSizeOptions, options => {
  if (!options.includes(pageSize.value)) pageSize.value = options[0] ?? 10
})

function rowId(row: any, index: number) {
  return String(row[props.rowKey] ?? `${firstIndex.value + index}`)
}
</script>

<template>
  <div class="overflow-hidden rounded-lg border bg-background">
    <div class="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow class="h-12">
            <TableHead v-for="column in columns" :key="column.key" :class="[column.align === 'right' && 'text-right', column.class]">{{ column.label }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="(row, index) in visibleRows" :key="rowId(row, index)" class="h-14">
            <TableCell v-for="column in columns" :key="column.key" :class="[column.align === 'right' && 'text-right', column.class]">
              <slot :name="`cell-${column.key}`" :row="row" :value="row[column.key]" :index="firstIndex + index">{{ row[column.key] ?? '—' }}</slot>
            </TableCell>
          </TableRow>
          <TableRow v-if="!rows.length"><TableCell :colspan="columns.length" class="h-24 text-center text-muted-foreground">{{ emptyText }}</TableCell></TableRow>
        </TableBody>
      </Table>
    </div>
    <TablePagination v-model:page="page" v-model:page-size="pageSize" :total="rows.length" :page-size-options="pageSizeOptions" />
  </div>
</template>

