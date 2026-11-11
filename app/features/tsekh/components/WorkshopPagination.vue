<script setup lang="ts">
import SharedPagination from '~/shared/pagination/Pagination.vue'

const props = defineProps<{ page: number; pageCount: number; start: number; shown: number; total: number }>()
const emit = defineEmits<{ 'update:page': [page: number] }>()
const pageSize = defineModel<number>('pageSize', { required: true })
</script>

<template>
  <SharedPagination v-model:page-size="pageSize" v-bind="props" :page-sizes="[5, 10, 50, 100]" @update:page="emit('update:page', $event)" />
</template>
