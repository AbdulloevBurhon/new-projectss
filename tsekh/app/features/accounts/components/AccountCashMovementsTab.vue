<script setup lang="ts">
import { Pencil, Plus, Trash2 } from '@lucide/vue'
import { computed, onMounted, ref, watch } from 'vue'
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Button, DataTable, Input, TabsContent, toast } from '@obshaya/ui'
import { useEmployeeAccess } from '../../workers/composables/useEmployeeAccess'
import { loadReceipts } from '../../../../endpoints/accounts/get-receipts/store'
import { saveReceipt } from '../../../../endpoints/accounts/create-receipt/store'
import { saveReceiptChanges } from '../../../../endpoints/accounts/update-receipt/store'
import { removeReceipt } from '../../../../endpoints/accounts/delete-receipt/store'
import { loadExpenses } from '../../../../endpoints/accounts/get-expenses/store'
import { saveExpense } from '../../../../endpoints/accounts/create-expense/store'
import { saveExpenseChanges } from '../../../../endpoints/accounts/update-expense/store'
import { removeExpense } from '../../../../endpoints/accounts/delete-expense/store'
import type { AccountRecord } from '../../../../endpoints/accounts/get-accounts/types'
import type { ReceiptRecord } from '../../../../endpoints/accounts/get-receipts/types'
import AccountMovementFormDialog from './AccountMovementFormDialog.vue'
import { dateTime, money, requestError } from '../format'

type Draft = Pick<ReceiptRecord, 'date' | 'accountId' | 'amount' | 'note'>
const props = defineProps<{ kind: 'income' | 'expense' }>()
const income = props.kind === 'income'
const load = income ? loadReceipts : loadExpenses
const create = income ? saveReceipt : saveExpense
const change = income ? saveReceiptChanges : saveExpenseChanges
const remove = income ? removeReceipt : removeExpense
const noun = income ? 'приход' : 'списание'
const label = income ? 'Приход' : 'Списание'
const { can } = useEmployeeAccess()
const accounts = useState('accounts', () => [] as AccountRecord[])
const rows = useState<ReceiptRecord[]>(income ? 'account-receipts' : 'account-expenses', () => [])
const open = ref(false)
const editing = ref<ReceiptRecord | null>(null)
const deleting = ref<ReceiptRecord | null>(null)
const from = ref('')
const to = ref('')
const visible = computed(() => rows.value.filter(row => (!from.value || row.date >= from.value) && (!to.value || row.date <= to.value))
  .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)))
const incomeColumns = [
  { key: 'dateTime', label: 'Дата и время', class: 'w-[28%]' },
  { key: 'amount', label: 'Сумма', class: 'w-[18%]' },
  { key: 'accountName', label: 'Счёт', class: 'w-[17%]' },
  { key: 'note', label: 'Заметка', class: 'w-[27%]' },
  { key: 'actions', label: 'Действия', align: 'right' as const, class: 'w-[10%]' },
]
async function refresh() {
  try { await load({ from: from.value || undefined, to: to.value || undefined }) }
  catch { toast.error(income ? 'Не удалось загрузить поступления.' : 'Не удалось загрузить списания.') }
}

onMounted(refresh)
watch([from, to], refresh)

function openForm(row: ReceiptRecord | null = null) {
  editing.value = row
  open.value = true
}

async function save(draft: Draft) {
  try {
    if (editing.value) await change({ id: editing.value.id, ...draft })
    else await create(draft)
    editing.value = null
    open.value = false
  } catch (error) {
    toast.error(income ? 'Не удалось сохранить приход денег.' : requestError(error, 'Не удалось сохранить списание.'))
  }
}

async function confirmDelete() {
  if (!deleting.value) return
  try {
    await remove({ id: deleting.value.id })
    deleting.value = null
  } catch {
    toast.error(income ? 'Не удалось удалить приход денег.' : 'Не удалось удалить списание.')
  }
}
</script>

<template>
  <TabsContent :value="income ? 'receipts' : 'expenses'">
    <div class="space-y-4">
      <div class="flex flex-wrap items-end gap-3">
        <label class="grid gap-1 text-sm">Дата от<Input v-model="from" type="date" :max="to || undefined" :aria-label="income ? 'Приходы с даты' : 'Списания с даты'" /></label>
        <label class="grid gap-1 text-sm">Дата до<Input v-model="to" type="date" :min="from || undefined" :aria-label="income ? 'Приходы по дату' : 'Списания по дату'" /></label>
        <Button class="ml-auto" :disabled="!accounts.length" @click="openForm()"><Plus class="size-4" />{{ label }}</Button>
      </div>
      <DataTable :columns="incomeColumns" :rows="visible" :empty-text="income
        ? (from || to ? 'За выбранный период приходов нет' : 'Приходов пока нет')
        : (from || to ? 'За выбранный период списаний нет' : 'Списаний пока нет')">
        <template #cell-dateTime="{ row }">{{ dateTime(row) }}</template>
        <template #cell-amount="{ row }">{{ money(row.amount) }} сом</template>
        <template #cell-note="{ row }">{{ row.note || label }}</template>
        <template #cell-actions="{ row }">
          <div class="flex justify-end gap-1">
            <Button v-if="can('accounts.edit')" size="icon" variant="ghost" :aria-label="`Изменить ${noun} на ${money(row.amount)} сом`" @click="openForm(row)"><Pencil class="size-4 text-blue-600" /></Button>
            <Button v-if="can('accounts.delete')" size="icon" variant="ghost" :aria-label="`Удалить ${noun} на ${money(row.amount)} сом`" @click="deleting = row"><Trash2 class="size-4 text-destructive" /></Button>
          </div>
        </template>
      </DataTable>
    </div>
  </TabsContent>
  <AccountMovementFormDialog v-model:open="open" :kind="kind" :accounts="accounts" :movement="editing" @save="save" />
  <AlertDialog :open="!!deleting" @update:open="value => { if (!value) deleting = null }">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Удалить {{ noun }}?</AlertDialogTitle>
        <AlertDialogDescription v-if="income">Приход будет удалён, а сумма счёта пересчитана.</AlertDialogDescription>
        <AlertDialogDescription v-else>Списание будет удалено, а сумма счёта возвращена.</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Отмена</AlertDialogCancel>
        <Button variant="destructive" @click="confirmDelete">Удалить</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
