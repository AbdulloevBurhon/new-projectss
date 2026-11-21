<script setup lang="ts">
import { Button, DataTable } from '@obshaya/ui'
import { computed, ref } from 'vue'
import type { RevisionHeader, RevisionRow } from '../../../../endpoints/revision/service'
import { operationDate } from '../../warehouse/format'
import { difference, quantity } from '../quantity'
import RevisionConfirm from './RevisionConfirm.vue'

const props = defineProps<{ header: RevisionHeader; rows: RevisionRow[]; busy: boolean; canPost: boolean }>()
const emit = defineEmits<{ recount: []; change: [action: 'post' | 'cancel'] }>()
const confirm = ref<'post' | 'cancel' | null>(null)
const filter = ref('all')
const draft = computed(() => props.header.status === 'draft')
const counted = computed(() => props.rows.filter(row => row.actual != null))
const skipped = computed(() => props.rows.length - counted.value.length)
const stale = computed(() => counted.value.filter(row => row.stale).length)
const groups = computed(() => [
  { label: 'Посчитано', number: counted.value.length, tone: 'text-foreground' },
  { label: 'Недостача', number: counted.value.filter(row => !row.stale && difference(row)! < 0).length, tone: 'text-destructive' },
  { label: 'Излишек', number: counted.value.filter(row => !row.stale && difference(row)! > 0).length, tone: 'text-emerald-800' },
  ...(draft.value ? [{ label: 'Без подсчёта', number: skipped.value, tone: 'text-muted-foreground' }] : []),
])
const filtered = computed(() => filter.value === 'all' ? counted.value : counted.value.filter(row => filter.value === 'stale'
  ? row.stale : !row.stale && difference(row) !== 0))
const columns = [
  { key: 'name', label: 'Товар' }, { key: 'book', label: 'По учёту', align: 'right' as const },
  { key: 'actual', label: 'Фактически', align: 'right' as const }, { key: 'delta', label: 'Расхождение', align: 'right' as const },
]
</script>

<template>
  <div v-if="!draft" class="rounded-lg border bg-background px-4 py-3 text-sm">
    <span class="font-semibold">{{ header.status === 'posted' ? 'Проведена' : 'Отменена' }}</span>
    <span v-if="header.closed" class="ml-2 text-muted-foreground">{{ operationDate.format(header.closed) }} · {{ header.actor }}</span>
  </div>
  <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <div v-for="group in groups" :key="group.label" class="space-y-1 rounded-xl border bg-background px-4 py-3">
      <p class="text-sm text-muted-foreground">{{ group.label }}</p>
      <p class="text-2xl font-semibold tabular-nums" :class="group.tone">{{ group.number }}</p>
    </div>
  </div>
  <div v-if="stale" class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" role="status">
    <span>Остаток изменился. Пересчитайте отмеченные позиции ({{ stale }}).</span>
    <Button variant="outline" :disabled="busy" @click="emit('recount')">К пересчёту</Button>
  </div>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <select v-model="filter" class="h-9 rounded-lg border bg-background px-3 text-sm" aria-label="Фильтр итогов">
      <option value="all">Все посчитанные</option>
      <option value="delta">С расхождениями</option>
      <option v-if="draft" value="stale">Нужно пересчитать</option>
    </select>
    <div v-if="draft && canPost" class="flex flex-wrap gap-2">
      <Button variant="outline" :disabled="busy" @click="confirm = 'cancel'">Отменить ревизию</Button>
      <Button :disabled="busy || !!stale || !counted.length" @click="confirm = 'post'">Провести ревизию</Button>
    </div>
    <p v-else-if="draft" class="text-sm text-muted-foreground">Результат проводит сотрудник с правом редактирования склада.</p>
  </div>
  <DataTable :columns="columns" :rows="filtered" :reset-key="filter" empty-text="Нет позиций в этой выборке">
    <template #cell-name="{ row }"><span class="font-medium">{{ row.name }}</span></template>
    <template #cell-book="{ row }">{{ quantity(row, row.book) }}</template>
    <template #cell-actual="{ row }">{{ quantity(row, row.actual) }}</template>
    <template #cell-delta="{ row }">
      <span v-if="row.stale" class="font-medium text-amber-800">Нужно пересчитать</span>
      <span v-else-if="difference(row)! < 0" class="font-medium text-destructive">Недостача {{ quantity(row, difference(row)) }}</span>
      <span v-else-if="difference(row)! > 0" class="font-medium text-emerald-800">Излишек +{{ quantity(row, difference(row)) }}</span>
      <span v-else class="text-muted-foreground">Совпало</span>
    </template>
  </DataTable>
  <RevisionConfirm :action="confirm" :skipped="skipped" @close="confirm = null"
    @confirm="action => { confirm = null; emit('change', action) }" />
</template>
