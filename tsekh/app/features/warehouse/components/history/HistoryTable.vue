<script setup lang="ts">
import { Check, Pencil, RotateCcw, Trash2 } from '@lucide/vue'
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, Button, DataTable, Input,
} from '@obshaya/ui'
import { useEmployeeAccess } from '../../../workers/composables/useEmployeeAccess'
import { useHistoryReceiptEditor } from '../../composables/useHistoryReceiptEditor'
import { useWarehouseContext } from '../../composables/warehouseContext'
import { numberFormat, operationDate } from '../../format'
import type { HistoryRow } from '../../types/history'

defineProps<{ rows: HistoryRow[]; filterKey: string }>()
const { can } = useEmployeeAccess()
const { accounts } = useWarehouseContext()
const { draft, selectedAccount, deleteTarget, busy, editError, deleteError, deleteOpen,
  startEdit, resetEdit, askToDelete, amountText, priceText, rowTotal, saveEdit, confirmDelete,
} = useHistoryReceiptEditor()

const historyColumns = [
  { key: 'operation', label: 'Операция, дата и время' },
  { key: 'product', label: 'Товар' },
  { key: 'warehouse', label: 'Склад' },
  { key: 'account', label: 'Счёт' },
  { key: 'worker', label: 'Сотрудник' },
  { key: 'quantity', label: 'Количество', align: 'right' as const },
  { key: 'opened', label: 'Открыто', align: 'right' as const },
  { key: 'purchase', label: 'Закупка', align: 'right' as const },
  { key: 'sale', label: 'Продажа', align: 'right' as const },
  { key: 'actions', label: 'Действия', align: 'right' as const },
]

</script>

<template>
  <DataTable :columns="historyColumns" :rows="rows" :reset-key="filterKey" row-key="rowKey" empty-text="Операций пока нет">
    <template #cell-operation="{ row }">{{ row.operation }} <small class="block text-muted-foreground">{{ operationDate.format(row.postedAt) }}</small></template>
    <template #cell-product="{ row }">{{ row.productName }}</template>
    <template #cell-warehouse="{ row }">{{ row.warehouseName }}</template>
    <template #cell-account="{ row }">
      <div v-if="draft && draft.id === row.receipt?.id" class="flex items-center gap-2">
        <select v-model="draft.accountId"
          class="h-9 max-w-44 rounded-md border bg-background px-2 disabled:opacity-60"
          aria-label="Счёт поступления" :disabled="busy">
          <option v-if="!accounts.some(account => account.id === row.receipt.accountId)" :value="row.receipt.accountId" disabled>Счёт удалён</option>
          <option v-for="account in accounts" :key="account.id" :value="account.id">{{ account.name }}</option>
        </select>
        <small class="whitespace-nowrap text-muted-foreground" aria-live="polite" title="Текущий баланс кассы">
          {{ amountText(selectedAccount?.amount) }}
        </small>
      </div>
      <template v-else>{{ row.receipt ? accounts.find(account => account.id === row.receipt.accountId)?.name ?? 'Счёт удалён' : row.accountName ?? '—' }}</template>
    </template>
    <template #cell-worker="{ row }">{{ row.employee ?? '—' }}</template>
    <template #cell-quantity="{ row }">
      <div v-if="draft && draft.id === row.receipt?.id" class="flex items-center justify-end gap-2">
        <Input v-model="draft.quantity" class="w-24" type="number" min="0.001" max="1000000" step="0.001" aria-label="Количество поступления" :disabled="busy" @keydown.enter.prevent="saveEdit(row.receipt)" />
        <small class="text-muted-foreground">{{ row.unit }}</small>
      </div>
      <template v-else>{{ row.quantity == null ? '—' : `${numberFormat.format(row.quantity)} ${row.unit}` }}</template>
    </template>
    <template #cell-opened="{ row }">{{ row.unit === 'уп' || row.receipt?.contentUnit ? '0' : '—' }}</template>
    <template #cell-purchase="{ row }">
      <div v-if="draft && draft.id === row.receipt?.id" class="flex items-center justify-end gap-2">
        <Input v-model="draft.unitPrice" class="w-24" type="number" min="0" max="1000000" step="0.01" aria-label="Цена закупки поступления" :disabled="busy" @keydown.enter.prevent="saveEdit(row.receipt)" />
        <small class="text-muted-foreground">сом/{{ row.unit }}</small>
      </div>
      <span v-else>{{ row.receipt ? amountText(row.total) : '—' }}</span>
      <small v-if="row.receipt" class="mt-1 block text-muted-foreground">
        {{ draft?.id === row.receipt.id ? amountText(rowTotal(row.receipt, 'unitPrice')) : priceText(row.receipt.unitPrice, row.unit) }}
      </small>
    </template>
    <template #cell-sale="{ row }">
      <template v-if="row.receipt">
        <div v-if="draft && draft.id === row.receipt.id" class="flex items-center justify-end gap-2">
          <Input v-model="draft.salePrice" class="w-24" type="number" min="0" max="1000000" step="0.01" aria-label="Цена продажи поступления" :disabled="busy" @keydown.enter.prevent="saveEdit(row.receipt)" />
          <small class="text-muted-foreground">сом/{{ row.receipt.contentUnit ?? row.unit }}</small>
        </div>
        <span v-else>{{ priceText(row.receipt.salePrice, row.receipt.contentUnit ?? row.unit) }}</span>
        <small class="mt-1 block text-muted-foreground">{{ amountText(rowTotal(row.receipt, 'salePrice')) }}</small>
      </template>
      <span v-else>{{ row.operation === 'Продажа' ? amountText(row.total) : '—' }}</span>
    </template>
    <template #cell-actions="{ row }">
      <div v-if="row.receipt" class="flex justify-end gap-1">
        <template v-if="draft?.id === row.receipt.id">
          <Button size="icon" variant="ghost" :disabled="busy" aria-label="Сохранить поступление" title="Сохранить" @click="saveEdit(row.receipt)"><Check class="size-4 text-green-600" /></Button>
          <Button size="icon" variant="ghost" :disabled="busy" aria-label="Сбросить изменения" title="Сбросить" @click="resetEdit"><RotateCcw class="size-4" /></Button>
        </template>
        <template v-else>
          <Button v-if="can('warehouses.edit')" size="icon" variant="ghost" :disabled="busy" :aria-label="`Изменить поступление ${row.productName}`" title="Редактировать" @click="startEdit(row.receipt)"><Pencil class="size-4 text-blue-600" /></Button>
          <Button v-if="can('warehouses.delete')" size="icon" variant="ghost" :disabled="busy" :aria-label="`Удалить поступление ${row.productName}`" title="Удалить" @click="askToDelete(row.receipt)"><Trash2 class="size-4 text-destructive" /></Button>
        </template>
      </div>
      <p v-if="row.receipt && draft?.id === row.receipt.id && editError" class="max-w-48 whitespace-normal text-xs text-destructive" role="alert">{{ editError }}</p>
    </template>
  </DataTable>
  <AlertDialog v-model:open="deleteOpen">
    <AlertDialogContent @escape-key-down="busy && $event.preventDefault()">
      <AlertDialogHeader>
        <AlertDialogTitle>Удалить поступление?</AlertDialogTitle>
        <AlertDialogDescription>Поступление товара «{{ deleteTarget?.productName }}» будет удалено. Остаток уменьшится, а сумма закупки вернётся на исходный счёт.</AlertDialogDescription>
      </AlertDialogHeader>
      <p v-if="deleteError" class="text-sm text-destructive" role="alert">{{ deleteError }}</p>
      <AlertDialogFooter>
        <AlertDialogCancel :disabled="busy">Отмена</AlertDialogCancel>
        <Button variant="destructive" :disabled="busy" @click="confirmDelete">{{ busy ? 'Удаление…' : 'Удалить' }}</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
