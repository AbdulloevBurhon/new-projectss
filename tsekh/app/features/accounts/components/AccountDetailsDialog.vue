<script setup lang="ts">
import { ref, watch } from 'vue'
import { Button, DataTable, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@obshaya/ui'
import { getAccountDetails } from '../../../../endpoints/accounts/get-account-details/service'
import type { AccountDetails, AccountOutflow } from '../../../../endpoints/accounts/get-account-details/types'
import type { AccountRecord } from '../../../../endpoints/accounts/get-accounts/types'

const props = defineProps<{ account: AccountRecord }>()
const emit = defineEmits<{ close: [] }>()
const details = ref<AccountDetails | null>(null)
const loading = ref(true)
const error = ref('')
const retry = ref(0)

const columns = [
  { key: 'date', label: 'Дата' },
  { key: 'description', label: 'Операция' },
  { key: 'employee', label: 'Сотрудник' },
  { key: 'quantity', label: 'Количество', align: 'right' as const },
  { key: 'unitPrice', label: 'Цена закупки', align: 'right' as const },
  { key: 'income', label: 'Поступление', align: 'right' as const },
  { key: 'sale', label: 'Продажа', align: 'right' as const },
  { key: 'amount', label: 'Списано', align: 'right' as const },
]
const labels = { purchase: 'Закупка', expense: 'Списание', transfer: 'Перевод', 'transfer-in': 'Входящий перевод', sale: 'Продажа', receipt: 'Поступление', 'client-payment': 'Погашение долга' }
const money = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const number = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 6 })
const dateTime = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' })

function formatDate(row: AccountOutflow) {
  if (row.kind === 'purchase' || row.kind === 'sale' || row.kind === 'client-payment') return dateTime.format(new Date(row.date))
  return row.date.split('-').reverse().join('.')
}

watch([() => props.account.id, retry], async ([id], _, onCleanup) => {
  const request = new AbortController()
  onCleanup(() => request.abort())
  details.value = null
  loading.value = true
  error.value = ''
  try {
    const result = await getAccountDetails(id, request.signal)
    if (!request.signal.aborted) details.value = result
  } catch {
    if (!request.signal.aborted) error.value = 'Не удалось загрузить операции по счёту.'
  } finally {
    if (!request.signal.aborted) loading.value = false
  }
}, { immediate: true })
</script>

<template>
  <Dialog :open="true" @update:open="open => { if (!open) emit('close') }">
    <DialogContent class="max-h-[90dvh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-[min(72rem,calc(100%-2rem))]">
      <DialogHeader>
        <DialogTitle>{{ details?.account.name ?? account.name }}</DialogTitle>
        <DialogDescription>Информация о счёте</DialogDescription>
      </DialogHeader>
      <p v-if="loading" class="text-sm text-muted-foreground" role="status">Загрузка операций…</p>
      <div v-else-if="error" class="flex flex-wrap items-center gap-3">
        <p class="text-sm text-destructive" role="alert">{{ error }}</p>
        <Button type="button" variant="outline" @click="retry++">Повторить</Button>
      </div>
      <template v-else-if="details">
        <p class="text-sm text-muted-foreground">Баланс <strong class="text-foreground">{{ money.format(details.account.amount) }} сом</strong></p>
        <DataTable :columns="columns" :rows="details.outflows" empty-text="По этому счёту ещё не было операций">
          <template #cell-date="{ row }">{{ formatDate(row) }}</template>
          <template #cell-description="{ row }">
            <span class="block whitespace-normal">{{ row.description }}</span>
            <small v-if="row.description !== labels[row.kind as AccountOutflow['kind']]" class="text-muted-foreground">{{ labels[row.kind as AccountOutflow['kind']] }}</small>
          </template>
          <template #cell-quantity="{ row }">
            <template v-if="row.quantity !== null">
              {{ number.format(row.quantity) }} {{ row.unit }}
              <small v-if="row.contentQuantity !== null && row.contentUnit" class="block text-muted-foreground">{{ number.format(row.contentQuantity) }} {{ row.contentUnit }}</small>
            </template>
            <template v-else>—</template>
          </template>
          <template #cell-unitPrice="{ row }">{{ row.unitPrice === null ? '—' : `${money.format(row.unitPrice)} сом/${row.unit}` }}</template>
          <template #cell-income="{row}">{{(row.kind==='receipt' || row.kind==='transfer-in' || row.kind==='client-payment') ? money.format(row.amount)+' сом' : '—'}}</template>
          <template #cell-sale="{row}">{{row.kind==='sale' ? money.format(row.amount)+' сом' : '—'}}</template>
          <template #cell-amount="{ row }"><span v-if="row.amount<0" class="font-medium text-destructive">{{ money.format(row.amount) }} сом</span><span v-else>—</span></template>
        </DataTable>
      </template>
    </DialogContent>
  </Dialog>
</template>
