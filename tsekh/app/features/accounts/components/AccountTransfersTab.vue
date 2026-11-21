<script setup lang="ts">
import { useEmployeeAccess } from '../../workers/composables/useEmployeeAccess'
import AccountMovementFormDialog from './AccountMovementFormDialog.vue'
import type { AccountRecord } from '../../../../endpoints/accounts/get-accounts/types'
import { loadTransfers } from '../../../../endpoints/accounts/get-transfers/store'
import type { TransferRecord } from '../../../../endpoints/accounts/get-transfers/types'
import { saveTransfer as createTransferRecord } from '../../../../endpoints/accounts/create-transfer/store'
import { saveTransferChanges } from '../../../../endpoints/accounts/update-transfer/store'
import { removeTransfer as deleteTransferRecord } from '../../../../endpoints/accounts/delete-transfer/store'
import { Pencil, Plus, Trash2 } from '@lucide/vue'
import { computed, onMounted, ref, watch } from 'vue'
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Button, DataTable, Input, TabsContent, toast } from '@obshaya/ui'
import { dateTime, money, requestError } from '../format'

type TransferRow = TransferRecord
const transferDialogOpen = ref(false)
const editingTransfer = ref<TransferRow | null>(null)
const deletingTransfer = ref<TransferRow | null>(null)
const transferFrom = ref('')
const transferTo = ref('')
const accountRows = useState('accounts', () => [] as AccountRecord[])
const transferRows = useState<TransferRow[]>('account-transfers', () => [])
const visibleTransfers = computed(() => transferRows.value.filter(row => (!transferFrom.value || row.date >= transferFrom.value) && (!transferTo.value || row.date <= transferTo.value)).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)))
const transferColumns = [
  { key: 'dateTime', label: 'Дата и время', class: 'w-[24%]' },
  { key: 'sourceAccountName', label: 'Со счёта', class: 'w-[18%]' },
  { key: 'targetAccountName', label: 'На счёт', class: 'w-[18%]' },
  { key: 'amount', label: 'Сумма', class: 'w-[15%]' },
  { key: 'note', label: 'Заметка', class: 'w-[15%]' },
  { key: 'actions', label: 'Действия', align: 'right' as const, class: 'w-[10%]' },
]

onMounted(async () => {
  try { transferRows.value = await loadTransfers() }
  catch { toast.error('Не удалось загрузить переводы.') }
})

watch([transferFrom, transferTo], async ([from, to]) => {
  try {
    transferRows.value = await loadTransfers({ from: from || undefined, to: to || undefined })
  } catch {
    toast.error('Не удалось загрузить переводы.')
  }
})

async function saveTransfer(draft: { date: string; sourceAccountId: string; targetAccountId: string; amount: number; note: string }) {
  try {
    if (editingTransfer.value) {
      await saveTransferChanges({ id: editingTransfer.value.id, ...draft })
    } else {
      await createTransferRecord(draft)
    }
  } catch (error) {
    toast.error(requestError(error, 'Не удалось сохранить перевод.'))
    return
  }
  editingTransfer.value = null
  transferDialogOpen.value = false
}

function openTransferForm(row: TransferRow | null = null) {
  editingTransfer.value = row
  transferDialogOpen.value = true
}

async function removeTransfer() {
  if (!deletingTransfer.value) return
  try {
    await deleteTransferRecord({ id: deletingTransfer.value.id })
    deletingTransfer.value = null
  } catch (error) {
    toast.error(requestError(error, 'Не удалось удалить перевод.'))
  }
}

const { can } = useEmployeeAccess()
</script>

<template>
  <TabsContent value="transfers" class="space-y-4">
    <div class="flex flex-wrap items-end gap-3">
      <label class="grid gap-1 text-sm">Дата от<Input v-model="transferFrom" type="date" :max="transferTo || undefined" aria-label="Переводы с даты" /></label>
      <label class="grid gap-1 text-sm">Дата до<Input v-model="transferTo" type="date" :min="transferFrom || undefined" aria-label="Переводы по дату" /></label>
      <Button class="ml-auto" :disabled="accountRows.length < 2" @click="openTransferForm()"><Plus class="size-4" />Перевод</Button>
    </div>
    <DataTable :columns="transferColumns" :rows="visibleTransfers" :empty-text="transferFrom || transferTo ? 'За выбранный период переводов нет' : 'Переводов пока нет'">
      <template #cell-dateTime="{ row }">{{ dateTime(row) }}</template>
      <template #cell-amount="{ row }">{{ money(row.amount) }} сом</template>
      <template #cell-note="{ row }">{{ row.note || 'Перевод между счетами' }}</template>
      <template #cell-actions="{ row }">
        <div class="flex justify-end gap-1">
          <Button v-if="can('accounts.edit')" size="icon" variant="ghost" :aria-label="`Изменить перевод ${row.sourceAccountName} — ${row.targetAccountName}`" @click="openTransferForm(row)"><Pencil class="size-4 text-blue-600" /></Button>
          <Button v-if="can('accounts.delete')" size="icon" variant="ghost" :aria-label="`Удалить перевод ${row.sourceAccountName} — ${row.targetAccountName}`" @click="deletingTransfer = row"><Trash2 class="size-4 text-destructive" /></Button>
        </div>
      </template>
    </DataTable>
  </TabsContent>
  <AccountMovementFormDialog v-model:open="transferDialogOpen" kind="transfer" :accounts="accountRows" :movement="editingTransfer" @save-transfer="saveTransfer" />
  <AlertDialog :open="!!deletingTransfer" @update:open="open => { if (!open) deletingTransfer = null }">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Удалить перевод?</AlertDialogTitle>
        <AlertDialogDescription>Сумма вернётся на исходный счёт. Для отмены на целевом счёте должны быть средства.</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Отмена</AlertDialogCancel>
        <Button variant="destructive" @click="removeTransfer">Удалить</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
