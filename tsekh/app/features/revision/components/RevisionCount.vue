<script setup lang="ts">
import { DataTable, Input } from '@obshaya/ui'
import { computed, ref } from 'vue'
import type { RevisionRow } from '../../../../endpoints/revision/service'
import { historySearchText } from '../../warehouse/composables/useHistoryFilters'
import { quantity } from '../quantity'
import RevisionCountCell from './RevisionCountCell.vue'

const props = defineProps<{ rows: RevisionRow[]; disabled: boolean; showStale: boolean; save: (row: RevisionRow, value: number | null) => Promise<boolean> }>()
const emit = defineEmits<{ filterChanged: [] }>()
const search = ref('')
const filter = ref('all')
const activeFilter = computed(() => props.showStale ? 'stale' : filter.value)
const columns = [
  { key: 'name', label: 'Товар и штрихкод' },
  { key: 'current', label: 'По учёту', align: 'right' as const },
  { key: 'actual', label: 'Фактически', align: 'right' as const },
]
const filtered = computed(() => {
  const term = historySearchText(search.value)
  return props.rows.filter(row => (activeFilter.value === 'all' || (activeFilter.value === 'stale' ? row.stale === 1 : row.actual == null))
    && (historySearchText(row.name).includes(term) || (row.barcode ?? '').includes(term)))
})
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <Input v-model="search" type="search" class="w-full sm:w-72" placeholder="Название или штрихкод" aria-label="Поиск товара" />
    <select :value="activeFilter" aria-label="Фильтр подсчёта" class="h-9 rounded-md border bg-background px-3 text-sm"
      @change="filter = ($event.target as HTMLSelectElement).value; emit('filterChanged')">
      <option value="all">Все позиции</option>
      <option value="uncounted">Без подсчёта</option>
      <option value="stale">Нужно пересчитать</option>
    </select>
    <p class="text-sm text-muted-foreground sm:ml-auto">Пустое поле — пропуск. Введите 0, если товара нет.</p>
  </div>
  <DataTable :columns="columns" :rows="filtered" :reset-key="`${search}:${activeFilter}`" empty-text="Позиции не найдены">
    <template #cell-name="{ row }">
      <span class="font-medium">{{ row.name }}</span>
      <small v-if="row.barcode" class="ml-2 text-muted-foreground">{{ row.barcode }}</small>
      <small v-if="row.contentUnit" class="block text-muted-foreground">1 {{ row.unit }} = {{ row.factor }} {{ row.contentUnit }}</small>
    </template>
    <template #cell-current="{ row }">{{ quantity(row, row.current) }}</template>
    <template #cell-actual="{ row }"><RevisionCountCell :row="row" :disabled="disabled" :save="save" /></template>
  </DataTable>
</template>
