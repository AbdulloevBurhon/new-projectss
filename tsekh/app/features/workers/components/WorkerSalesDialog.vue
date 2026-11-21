<script setup lang="ts">
import { Button, DataTable, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input } from '@obshaya/ui'
import { employeeError, employeeSales } from '../../../../endpoints/workers/service'
import type { Employee, WorkerSale } from '../../../../endpoints/workers/types'
import { money } from '../../../../endpoints/sales/service'

const props = defineProps<{ employee: Employee }>()
const emit = defineEmits<{ close: [] }>()
const from = ref(''), to = ref('')
const sales = ref<WorkerSale[]>([])
const error = ref('')
const loading = ref(true)
const total = computed(() => sales.value.reduce((sum, sale) => sum + sale.total, 0))
const debt = computed(() => sales.value.reduce((sum, sale) => sum + sale.debt, 0))
const formatDate = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' })
const columns = [
  { key: 'date', label: 'Дата и время' },
  { key: 'amount', label: 'Продажа', align: 'right' as const },
  { key: 'debt', label: 'Долг клиента' },
  { key: 'product', label: 'Товар' },
  { key: 'qty', label: 'Количество', align: 'right' as const },
]

function boundary(day: string, end = false) {
  if (!day) return
  const date = new Date(`${day}T00:00:00`)
  if (end) date.setDate(date.getDate() + 1)
  if (Number.isFinite(date.getTime())) return date.toISOString()
}

watch([from, to], async (_, __, onCleanup) => {
  const controller = new AbortController()
  onCleanup(() => controller.abort())
  loading.value = true
  error.value = ''
  try {
    const rows = await employeeSales(props.employee.id, boundary(from.value), boundary(to.value, true), controller.signal)
    if (!controller.signal.aborted) sales.value = rows
  } catch (cause) {
    if (!controller.signal.aborted) error.value = employeeError(cause, 'Не удалось загрузить продажи.')
  } finally {
    if (!controller.signal.aborted) loading.value = false
  }
}, { immediate: true })
</script>

<template>
  <Dialog :open="true" @update:open="open => { if (!open) emit('close') }">
    <DialogContent class="max-h-[90vh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-4xl">
      <DialogHeader><DialogTitle>{{ employee.name }}</DialogTitle><DialogDescription>{{ employee.role }} · {{ employee.phone }}</DialogDescription></DialogHeader>
      <div v-if="!error" class="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <span>Продажи <strong>{{ loading ? '…' : money(total) }}</strong></span>
        <span>Долг клиентов <strong>{{ loading ? '…' : money(debt) }}</strong></span>
      </div>
      <div class="flex flex-wrap items-end gap-3">
        <label class="grid gap-1 text-sm">С даты<Input v-model="from" type="date" :max="to || undefined" /></label>
        <label class="grid gap-1 text-sm">По дату<Input v-model="to" type="date" :min="from || undefined" /></label>
        <Button v-if="from || to" type="button" variant="outline" @click="from = ''; to = ''">Сбросить</Button>
      </div>
      <p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>
      <p v-else-if="loading" class="text-sm text-muted-foreground" role="status">Загрузка продаж…</p>
      <DataTable v-else :columns="columns" :rows="sales" :reset-key="JSON.stringify([from,to])" empty-text="За выбранный период продаж нет">
        <template #cell-date="{ row }">{{ formatDate.format(new Date(row.date)) }}</template>
        <template #cell-amount="{ row }">{{ money(row.total) }}</template>
        <template #cell-debt="{ row }"><template v-if="row.debt"><span>{{ row.clientName }}</span><small class="block text-muted-foreground">{{ money(row.debt) }}</small></template><span v-else>—</span></template>
        <template #cell-product="{ row }"><div v-for="(line, i) in row.lines" :key="i">{{ line.name }}</div></template>
        <template #cell-qty="{ row }"><div v-for="(line, i) in row.lines" :key="i">{{ line.qty }} {{ line.unit }}</div></template>
      </DataTable>
    </DialogContent>
  </Dialog>
</template>
