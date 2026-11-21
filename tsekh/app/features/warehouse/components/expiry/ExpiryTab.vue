<script setup lang="ts">
import { Button, DataTable, Input, TabsContent } from '@obshaya/ui'
import { Check, LoaderCircle, Pencil, RefreshCw, X } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { loadStockExpiry, type StockExpiryRow } from '../../../../../endpoints/warehouse/stock-receipts/expiry'
import { useWarehouseContext } from '../../composables/warehouseContext'
import { numberFormat } from '../../format'
import { expiryFilters, expiryStatus } from './expiryDisplay'
import { useExpiryEditor } from '../../composables/expiry/useExpiryEditor'
import { useEmployeeAccess } from '../../../workers/composables/useEmployeeAccess'

const { activeTab, state } = useWarehouseContext()
const data = ref<StockExpiryRow[]>([])
const { can } = useEmployeeAccess()
const { draft, saving, editError, start, cancel, save } = useExpiryEditor((receipt, expiresOn) => {
  data.value = data.value.map(row => row.receiptId === receipt ? { ...row, expiresOn } : row)
})
const vFocus = { mounted: (el: HTMLElement) => el.focus() }
const today = ref(new Date())
const pending = ref(false)
const error = ref('')
const refresh = ref(0)
const warehouse = ref('')
const term = ref('')
const filter = ref('all')
const columns = [
  { key: 'name', label: 'Товар' }, { key: 'warehouseName', label: 'Склад' },
  { key: 'postedAt', label: 'Поступление' }, { key: 'quantity', label: 'Осталось', align: 'right' as const },
  { key: 'expiresOn', label: 'Срок' }, { key: 'status', label: 'Осталось до срока' },
  { key: 'actions', label: 'Действия', align: 'right' as const },
]
const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
const searchText = (value: string) => value.trim().toLocaleLowerCase('ru').replaceAll('ё', 'е')
const rows = computed(() => {
  const query = searchText(term.value)
  return data.value.filter(row => (!warehouse.value || row.warehouse === warehouse.value)
    && (searchText(row.name).includes(query) || (row.barcode ?? '').toLowerCase().includes(query)))
    .map(row => ({ ...row, status: expiryStatus(row, today.value) }))
    .filter(row => filter.value === 'all' || row.status.filter === filter.value)
    .sort((a, b) => (a.expiresOn ?? '9999-99-99').localeCompare(b.expiresOn ?? '9999-99-99')
      || (a.postedAt ?? 0) - (b.postedAt ?? 0) || a.name.localeCompare(b.name, 'ru'))
})
watch([activeTab, refresh], async ([tab], _, onCleanup) => {
  cancel()
  if (tab !== 'expiry') return
  let active = true
  onCleanup(() => { active = false })
  pending.value = true
  error.value = ''
  try {
    const result = await loadStockExpiry()
    if (active) { data.value = result; today.value = new Date() }
  } catch {
    if (active) error.value = 'Не удалось загрузить сроки годности.'
  } finally {
    if (active) pending.value = false
  }
}, { immediate: true })
</script>

<template>
  <TabsContent value="expiry" class="space-y-4">
    <div class="flex flex-wrap items-end gap-3">
      <Input v-model="term" type="search" class="w-full max-w-xs" placeholder="Название или штрихкод" aria-label="Поиск товара по сроку" />
      <label class="grid gap-1 text-sm">Склад
        <select v-model="warehouse" class="h-9 min-w-40 rounded-md border bg-background px-3" aria-label="Склад партии">
          <option value="">Все склады</option>
          <option v-for="entry in state.rows" :key="entry.id" :value="entry.id">{{ entry.name }}</option>
        </select>
      </label>
      <label class="grid gap-1 text-sm">Срок
        <select v-model="filter" class="h-9 min-w-44 rounded-md border bg-background px-3" aria-label="Фильтр по сроку">
          <option v-for="entry in expiryFilters" :key="entry.id" :value="entry.id">{{ entry.label }}</option>
        </select>
      </label>
      <Button variant="outline" :disabled="pending || saving" @click="refresh++"><RefreshCw class="size-4" />Обновить</Button>
    </div>
    <p v-if="pending" class="text-sm text-muted-foreground" role="status">Загрузка партий…</p>
    <p v-else-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>
    <DataTable v-else :columns="columns" :rows="rows" :reset-key="JSON.stringify([term,warehouse,filter])" empty-text="Партии не найдены">
      <template #cell-name="{ row }">
        <span class="font-medium">{{ row.name }}</span>
        <small v-if="row.barcode" class="block text-muted-foreground">{{ row.barcode }}</small>
      </template>
      <template #cell-postedAt="{ row }">{{ row.postedAt == null ? '—' : dateFormat.format(row.postedAt) }}</template>
      <template #cell-quantity="{ row }"><span class="whitespace-nowrap tabular-nums">{{ numberFormat.format(row.quantity) }} {{ row.unit }}</span></template>
      <template #cell-expiresOn="{ row }">
        <template v-if="draft?.row.id === row.id">
          <Input v-focus v-model="draft.date" type="date" max="9999-12-31" class="w-36 px-2"
            :aria-label="`Срок годности ${row.name}`" :disabled="saving" @keydown.enter.prevent="save" @keydown.esc.prevent.stop="cancel" />
          <p v-if="editError" role="alert" class="mt-1 max-w-48 whitespace-normal text-xs text-destructive">{{ editError }}</p>
        </template>
        <template v-else>{{ row.expiresOn?.split('-').reverse().join('.') ?? '—' }}</template>
      </template>
      <template #cell-status="{ row }"><span :class="row.status.tone">{{ row.status.label }}</span></template>
      <template #cell-actions="{ row }">
        <div v-if="draft?.row.id === row.id" class="flex justify-end gap-1">
          <Button size="icon" variant="ghost" :disabled="saving" aria-label="Сохранить срок" title="Сохранить срок" @click="save">
            <LoaderCircle v-if="saving" class="size-4 motion-safe:animate-spin" />
            <Check v-else class="size-4 text-green-600" />
          </Button>
          <Button size="icon" variant="ghost" :disabled="saving" aria-label="Отменить изменение срока" title="Отменить" @click="cancel"><X class="size-4" /></Button>
        </div>
        <Button v-else-if="row.receiptId && can('warehouses.edit')" size="icon" variant="ghost" :disabled="saving"
          :aria-label="`Изменить срок ${row.name}`" title="Изменить срок" @click="start(row)"><Pencil class="size-4 text-blue-600" /></Button>
        <span v-else class="text-muted-foreground">—</span>
      </template>
    </DataTable>
  </TabsContent>
</template>
