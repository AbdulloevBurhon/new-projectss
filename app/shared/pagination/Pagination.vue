<script setup lang="ts">
import { Button } from '../button'
import Select from '../select/Select.vue'

const props = defineProps<{ page: number; pageCount: number; start: number; shown: number; total: number; pageSizes?: number[] }>()
const emit = defineEmits<{ 'update:page': [page: number] }>()
const pageSize = defineModel<number>('pageSize', { required: true })
const sizes = computed(() => (props.pageSizes?.length ? props.pageSizes : [5, 10, 20, 50]))
const sizeOptions = computed(() => sizes.value.map(size => ({ label: String(size), value: size })))
</script>

<template>
  <nav class="shared-pagination" aria-label="Пагинация таблицы">
    <span class="shared-pagination-range" aria-live="polite">{{ shown ? `${start + 1}–${start + shown} из ${total}` : `0 из ${total}` }}</span>
    <div class="shared-pagination-controls">
      <label class="shared-page-size"><span>Строк на странице</span><Select v-model="pageSize" :options="sizeOptions" :aria-label="'Строк на странице'" /></label>
      <span class="shared-page-number">{{ page }} / {{ pageCount }}</span>
      <Button variant="outline" size="icon" aria-label="Предыдущая страница" :disabled="page <= 1" @click="emit('update:page', page - 1)">‹</Button>
      <Button variant="outline" size="icon" aria-label="Следующая страница" :disabled="page >= pageCount" @click="emit('update:page', page + 1)">›</Button>
    </div>
  </nav>
</template>

<style scoped>
.shared-pagination { display: flex; align-items: center; justify-content: space-between; gap: 14px; min-height: 54px; padding: 9px 14px; border-top: 1px solid #e5ebf2; color: #62748d; font-size: 12px; }
.shared-pagination-controls { display: flex; align-items: center; gap: 8px; }
.shared-page-size { display: flex; align-items: center; gap: 7px; }
.shared-page-size :deep(.shared-field) { display: block; }
.shared-page-size :deep(select) { min-height: 34px; width: 72px; padding: 5px 24px 5px 8px; font-size: 12px; }
.shared-page-number { min-width: 42px; text-align: center; }
@media (max-width: 560px) { .shared-pagination { align-items: flex-start; flex-direction: column; } .shared-pagination-controls { width: 100%; justify-content: flex-end; } .shared-page-size > span { display: none; } }
</style>
