<script setup lang="ts" generic="T">
import WorkshopPagination from './WorkshopPagination.vue'

const props = defineProps<{ rows: readonly T[]; resetKey?: string; tableClass?: string }>()
defineSlots<{ default(props: { pageRows: T[] }): unknown }>()

const page = ref(1)
const pageSize = ref(5)
const pageCount = computed(() => Math.max(1, Math.ceil(props.rows.length / pageSize.value)))
const currentPage = computed(() => Math.min(page.value, pageCount.value))
const start = computed(() => (currentPage.value - 1) * pageSize.value)
const pageRows = computed(() => props.rows.slice(start.value, start.value + pageSize.value))

watch([pageSize, () => props.resetKey], () => { page.value = 1 })
watch(pageCount, count => { page.value = Math.min(page.value, count) })
</script>

<template>
  <div class="workshop-table">
    <div class="workshop-table-scroll">
      <table class="inventory-table" :class="tableClass">
        <slot :page-rows="pageRows" />
      </table>
    </div>
    <WorkshopPagination v-model:page-size="pageSize" :page="currentPage" :page-count="pageCount"
      :start="start" :shown="pageRows.length" :total="rows.length" @update:page="page = $event" />
  </div>
</template>
