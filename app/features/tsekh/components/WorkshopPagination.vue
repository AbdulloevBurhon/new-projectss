<script setup lang="ts">
import WorkshopIcon from './WorkshopIcon.vue'

defineProps<{ page: number; pageCount: number; start: number; shown: number; total: number }>()
defineEmits<{ 'update:page': [page: number] }>()
const pageSize = defineModel<number>('pageSize', { required: true })
const pageSizes = [5, 10, 50, 100]
</script>

<template>
  <nav class="workshop-pagination" aria-label="Пагинация таблицы">
    <span class="workshop-pagination-range" aria-live="polite">
      {{ shown ? `${start + 1}–${start + shown} из ${total}` : '0 из 0' }}
    </span>
    <div class="workshop-pagination-controls">
      <label class="workshop-page-size">
        <span>Строк на странице</span>
        <select v-model="pageSize">
          <option v-for="size in pageSizes" :key="size" :value="size">{{ size }}</option>
        </select>
      </label>
      <button type="button" class="icon-button secondary workshop-page-prev" aria-label="Предыдущая страница"
        :disabled="page <= 1" @click="$emit('update:page', page - 1)">
        <WorkshopIcon name="chevron" />
      </button>
      <button type="button" class="icon-button secondary" aria-label="Следующая страница"
        :disabled="page >= pageCount" @click="$emit('update:page', page + 1)">
        <WorkshopIcon name="chevron" />
      </button>
    </div>
  </nav>
</template>
