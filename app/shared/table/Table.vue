<script setup lang="ts" generic="T">
import Pagination from '../pagination/Pagination.vue'

const props = withDefaults(defineProps<{
  rows: readonly T[]
  resetKey?: string | number
  tableClass?: string
  containerClass?: string
  scrollClass?: string
  pageSizes?: number[]
  initialPageSize?: number
  selectable?: boolean
  rowKey?: keyof T
}>(), { tableClass: '', containerClass: '', scrollClass: '', pageSizes: () => [5, 10, 20, 50], initialPageSize: 10, selectable: false })
const page = ref(1)
const pageSize = ref(props.initialPageSize)
const selectedKeys = defineModel<string[]>('selectedKeys', { default: () => [] })
const pageCount = computed(() => Math.max(1, Math.ceil(props.rows.length / pageSize.value)))
const currentPage = computed(() => Math.min(page.value, pageCount.value))
const start = computed(() => (currentPage.value - 1) * pageSize.value)
const pageRows = computed(() => props.rows.slice(start.value, start.value + pageSize.value))
const keysOnPage = computed(() => pageRows.value.map(rowKeyOf))
const allPageSelected = computed(() => keysOnPage.value.length > 0 && keysOnPage.value.every(key => selectedKeys.value.includes(key)))

function rowKeyOf(row: T) {
  const value = props.rowKey ? (row as Record<keyof T, unknown>)[props.rowKey] : (row as { id?: unknown } | null)?.id
  return String(value ?? '')
}
function isSelected(row: T) { return selectedKeys.value.includes(rowKeyOf(row)) }
function toggleRow(row: T, checked: boolean) {
  const key = rowKeyOf(row)
  selectedKeys.value = checked ? [...new Set([...selectedKeys.value, key])] : selectedKeys.value.filter(item => item !== key)
}
function togglePage(checked: boolean) {
  selectedKeys.value = checked
    ? [...new Set([...selectedKeys.value, ...keysOnPage.value])]
    : selectedKeys.value.filter(key => !keysOnPage.value.includes(key))
}

watch([pageSize, () => props.resetKey], () => { page.value = 1 })
watch(pageCount, count => { page.value = Math.min(page.value, count) })
</script>

<template>
  <div class="shared-table" :class="containerClass">
    <div class="shared-table-scroll" :class="scrollClass">
      <table class="shared-table-element" :class="tableClass">
        <slot :page-rows="pageRows" :selected-keys="selectedKeys" :selectable="selectable" :all-page-selected="allPageSelected" :is-selected="isSelected" :toggle-row="toggleRow" :toggle-page="togglePage" />
      </table>
      <p v-if="!rows.length" class="shared-table-empty" role="status"><slot name="empty">Нет данных.</slot></p>
    </div>
    <Pagination v-model:page-size="pageSize" :page="currentPage" :page-count="pageCount" :start="start" :shown="pageRows.length" :total="rows.length" :page-sizes="pageSizes" @update:page="page = $event" />
  </div>
</template>

<style scoped>
.shared-table { min-width: 0; }
.shared-table-scroll { overflow-x: auto; }
.shared-table-element { width: 100%; border-collapse: collapse; }
.shared-table-empty { margin: 0; padding: 24px 14px; color: #687991; text-align: center; font-size: 13px; }
</style>
