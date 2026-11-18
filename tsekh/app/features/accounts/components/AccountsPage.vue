<script setup lang="ts">
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, Info, Pencil, Plus, Trash2, Wallet } from '@lucide/vue'
import { computed, onMounted, ref, watch } from 'vue'
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Button, DataTable, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input, Tabs, TabsContent, TabsList, TabsTrigger, toast } from '@obshaya/ui'
import AccountFormDialog from './AccountFormDialog.vue'
import AccountMovementFormDialog from './AccountMovementFormDialog.vue'
import type { AccountRecord } from '../../../../endpoints/accounts/get-accounts/types'
import { loadAccounts } from '../../../../endpoints/accounts/get-accounts/store'
import { saveAccount as createAccountRecord } from '../../../../endpoints/accounts/create-account/store'
import { saveAccountChanges } from '../../../../endpoints/accounts/update-account/store'
import { removeAccount as deleteAccountRecord } from '../../../../endpoints/accounts/delete-account/store'
import { loadReceipts } from '../../../../endpoints/accounts/get-receipts/store'
import type { ReceiptRecord } from '../../../../endpoints/accounts/get-receipts/types'
import { saveReceipt } from '../../../../endpoints/accounts/create-receipt/store'
import { saveReceiptChanges } from '../../../../endpoints/accounts/update-receipt/store'
import { removeReceipt } from '../../../../endpoints/accounts/delete-receipt/store'
import { loadExpenses } from '../../../../endpoints/accounts/get-expenses/store'
import type { ExpenseRecord } from '../../../../endpoints/accounts/get-expenses/types'
import { saveExpense as createExpenseRecord } from '../../../../endpoints/accounts/create-expense/store'
import { saveExpenseChanges } from '../../../../endpoints/accounts/update-expense/store'
import { removeExpense as deleteExpenseRecord } from '../../../../endpoints/accounts/delete-expense/store'
import { loadTransfers } from '../../../../endpoints/accounts/get-transfers/store'
import type { TransferRecord } from '../../../../endpoints/accounts/get-transfers/types'
import { saveTransfer as createTransferRecord } from '../../../../endpoints/accounts/create-transfer/store'
import { saveTransferChanges } from '../../../../endpoints/accounts/update-transfer/store'
import { removeTransfer as deleteTransferRecord } from '../../../../endpoints/accounts/delete-transfer/store'

type MovementRow = { id: string; date: string; createdAt: string; accountId: string; accountName: string; amount: number; note: string }
type TransferRow = TransferRecord

const activeTab = ref('accounts')
const accountSearch = ref('')
const accountDialogOpen = ref(false)
const editingAccount = ref<AccountRecord | null>(null)
const viewingAccount = ref<AccountRecord | null>(null)
const deletingAccount = ref<AccountRecord | null>(null)
const incomeDialogOpen = ref(false)
const expenseDialogOpen = ref(false)
const transferDialogOpen = ref(false)
const editingIncome = ref<MovementRow | null>(null)
const editingExpense = ref<MovementRow | null>(null)
const editingTransfer = ref<TransferRow | null>(null)
const deletingIncome = ref<MovementRow | null>(null)
const deletingExpense = ref<MovementRow | null>(null)
const deletingTransfer = ref<TransferRow | null>(null)
const incomeFrom = ref('')
const incomeTo = ref('')
const expenseFrom = ref('')
const expenseTo = ref('')
const transferFrom = ref('')
const transferTo = ref('')
const accountRows = useState('accounts', () => [] as AccountRecord[])
const incomeRows = useState<ReceiptRecord[]>('account-receipts', () => [])
const expenseRows = useState<ExpenseRecord[]>('account-expenses', () => [])
const transferRows = useState<TransferRow[]>('account-transfers', () => [])
const tabs = [
  { value: 'accounts', label: 'Счёт', icon: Wallet },
  { value: 'receipts', label: 'Поступление', icon: ArrowDownToLine },
  { value: 'expenses', label: 'Списание', icon: ArrowUpFromLine },
  { value: 'transfers', label: 'Перевод', icon: ArrowLeftRight },
]
const activeTitle = computed(() => tabs.find(tab => tab.value === activeTab.value)?.label ?? 'Счёт')
const visibleAccounts = computed(() => accountRows.value.filter(row => row.name.toLocaleLowerCase('ru').includes(accountSearch.value.trim().toLocaleLowerCase('ru'))))
const visibleIncome = computed(() => incomeRows.value.filter(row => (!incomeFrom.value || row.date >= incomeFrom.value) && (!incomeTo.value || row.date <= incomeTo.value)).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)))
const visibleExpenses = computed(() => expenseRows.value.filter(row => (!expenseFrom.value || row.date >= expenseFrom.value) && (!expenseTo.value || row.date <= expenseTo.value)).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)))
const visibleTransfers = computed(() => transferRows.value.filter(row => (!transferFrom.value || row.date >= transferFrom.value) && (!transferTo.value || row.date <= transferTo.value)).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)))
const accountColumns = [
  { key: 'name', label: 'Название' },
  { key: 'amount', label: 'Сумма', align: 'right' as const },
  { key: 'actions', label: 'Действия', align: 'right' as const },
]
const incomeColumns = [
  { key: 'dateTime', label: 'Дата и время', class: 'w-[28%]' },
  { key: 'amount', label: 'Сумма', class: 'w-[18%]' },
  { key: 'accountName', label: 'Счёт', class: 'w-[17%]' },
  { key: 'note', label: 'Заметка', class: 'w-[27%]' },
  { key: 'actions', label: 'Действия', align: 'right' as const, class: 'w-[10%]' },
]
const transferColumns = [
  { key: 'dateTime', label: 'Дата и время', class: 'w-[24%]' },
  { key: 'sourceAccountName', label: 'Со счёта', class: 'w-[18%]' },
  { key: 'targetAccountName', label: 'На счёт', class: 'w-[18%]' },
  { key: 'amount', label: 'Сумма', class: 'w-[15%]' },
  { key: 'note', label: 'Заметка', class: 'w-[15%]' },
  { key: 'actions', label: 'Действия', align: 'right' as const, class: 'w-[10%]' },
]

onMounted(async () => {
  try {
    accountRows.value = await loadAccounts()
    incomeRows.value = await loadReceipts()
    expenseRows.value = await loadExpenses()
    transferRows.value = await loadTransfers()
  } catch {
    toast.error('Не удалось загрузить данные счёта из базы данных.')
  }
})

watch([incomeFrom, incomeTo], async ([from, to]) => {
  try {
    incomeRows.value = await loadReceipts({ from: from || undefined, to: to || undefined })
  } catch {
    toast.error('Не удалось загрузить поступления.')
  }
})

watch([expenseFrom, expenseTo], async ([from, to]) => {
  try {
    expenseRows.value = await loadExpenses({ from: from || undefined, to: to || undefined })
  } catch {
    toast.error('Не удалось загрузить списания.')
  }
})

watch([transferFrom, transferTo], async ([from, to]) => {
  try {
    transferRows.value = await loadTransfers({ from: from || undefined, to: to || undefined })
  } catch {
    toast.error('Не удалось загрузить переводы.')
  }
})

function money(amount: number) {
  return new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
}

function requestError(error: unknown, fallback: string) {
  const message = (error as { data?: { statusMessage?: string } })?.data?.statusMessage
  return typeof message === 'string' ? message : fallback
}

async function saveAccount(draft: { name: string }) {
  try {
    if (editingAccount.value) {
      await saveAccountChanges({ id: editingAccount.value.id, name: draft.name })
    } else {
      await createAccountRecord(draft)
    }
  } catch {
    toast.error('Не удалось сохранить счёт.')
    return
  }
  editingAccount.value = null
  accountDialogOpen.value = false
}

async function confirmDeleteAccount() {
  if (!deletingAccount.value) return
  try {
    await deleteAccountRecord({ id: deletingAccount.value.id })
    deletingAccount.value = null
  } catch {
    toast.error('Не удалось удалить счёт.')
  }
}

async function saveIncome(draft: { date: string; accountId: string; amount: number; note: string }) {
  try {
    if (editingIncome.value) {
      await saveReceiptChanges({ id: editingIncome.value.id, ...draft })
    } else {
      await saveReceipt(draft)
    }
  } catch {
    toast.error('Не удалось сохранить приход денег.')
    return
  }
  editingIncome.value = null
  incomeDialogOpen.value = false
}

async function saveExpense(draft: { date: string; accountId: string; amount: number; note: string }) {
  try {
    if (editingExpense.value) {
      await saveExpenseChanges({ id: editingExpense.value.id, ...draft })
    } else {
      await createExpenseRecord(draft)
    }
  } catch (error) {
    toast.error(requestError(error, 'Не удалось сохранить списание.'))
    return
  }
  editingExpense.value = null
  expenseDialogOpen.value = false
}

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

function openIncomeForm(row: MovementRow | null = null) {
  editingIncome.value = row
  incomeDialogOpen.value = true
}

function openExpenseForm(row: MovementRow | null = null) {
  editingExpense.value = row
  expenseDialogOpen.value = true
}

function openTransferForm(row: TransferRow | null = null) {
  editingTransfer.value = row
  transferDialogOpen.value = true
}

function dateTime(row: Pick<MovementRow, 'date' | 'createdAt'>) {
  const timestamp = new Date(row.createdAt)
  return Number.isNaN(timestamp.getTime()) ? row.date : `${new Date(`${row.date}T00:00:00`).toLocaleDateString('ru-RU')} ${timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
}

async function removeIncome() {
  if (!deletingIncome.value) return
  try {
    await removeReceipt({ id: deletingIncome.value.id })
    deletingIncome.value = null
  } catch {
    toast.error('Не удалось удалить приход денег.')
  }
}

async function removeExpense() {
  if (!deletingExpense.value) return
  try {
    await deleteExpenseRecord({ id: deletingExpense.value.id })
    deletingExpense.value = null
  } catch {
    toast.error('Не удалось удалить списание.')
  }
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

function updateDeleteDialog(open: boolean) {
  if (!open) {
    deletingIncome.value = null
    deletingExpense.value = null
    deletingTransfer.value = null
  }
}
</script>

<template>
  <section class="w-full p-5 text-slate-900 sm:p-8">
    <h1 class="mt-2 text-3xl font-semibold tracking-tight">{{ activeTitle }}</h1>
    <Tabs v-model:model-value="activeTab" class="mt-6 gap-5">
      <TabsList class="h-auto w-fit flex-wrap rounded-xl bg-muted p-1.5">
        <TabsTrigger v-for="tab in tabs" :key="tab.value" :value="tab.value" class="h-9 flex-none gap-2 rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
          <component :is="tab.icon" class="size-4 text-blue-600" />
          {{ tab.label }}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="accounts" class="space-y-4">
        <div class="flex flex-wrap items-center gap-3">
          <Input v-model="accountSearch" class="max-w-xs" type="search" placeholder="Поиск по названию" aria-label="Поиск счёта" />
          <Button class="ml-auto" @click="editingAccount = null; accountDialogOpen = true"><Plus class="size-4" />Счёт</Button>
        </div>
        <DataTable :columns="accountColumns" :rows="visibleAccounts" :empty-text="accountSearch.trim() ? 'Совпадений не найдено' : 'Счетов пока нет'">
          <template #cell-amount="{ row }">{{ money(row.amount) }} сом</template>
          <template #cell-actions="{ row }">
            <div class="flex justify-end gap-1">
              <Button size="icon" variant="ghost" :aria-label="`Информация о счёте ${row.name}`" @click="viewingAccount = row"><Info class="size-4 text-sky-600" /></Button>
              <Button size="icon" variant="ghost" :aria-label="`Редактировать счёт ${row.name}`" @click="editingAccount = row; accountDialogOpen = true"><Pencil class="size-4 text-blue-600" /></Button>
              <Button size="icon" variant="ghost" :aria-label="`Удалить счёт ${row.name}`" @click="deletingAccount = row"><Trash2 class="size-4 text-destructive" /></Button>
            </div>
          </template>
        </DataTable>
      </TabsContent>

      <TabsContent v-for="tab in tabs.slice(1)" :key="tab.value" :value="tab.value">
        <div v-if="tab.value === 'transfers'" class="space-y-4">
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
                <Button size="icon" variant="ghost" :aria-label="`Изменить перевод ${row.sourceAccountName} — ${row.targetAccountName}`" @click="openTransferForm(row)"><Pencil class="size-4 text-blue-600" /></Button>
                <Button size="icon" variant="ghost" :aria-label="`Удалить перевод ${row.sourceAccountName} — ${row.targetAccountName}`" @click="deletingTransfer = row"><Trash2 class="size-4 text-destructive" /></Button>
              </div>
            </template>
          </DataTable>
        </div>
        <div v-else-if="tab.value === 'receipts'" class="space-y-4">
          <div class="flex flex-wrap items-end gap-3">
            <label class="grid gap-1 text-sm">Дата от<Input v-model="incomeFrom" type="date" :max="incomeTo || undefined" aria-label="Приходы с даты" /></label>
            <label class="grid gap-1 text-sm">Дата до<Input v-model="incomeTo" type="date" :min="incomeFrom || undefined" aria-label="Приходы по дату" /></label>
            <Button class="ml-auto" :disabled="!accountRows.length" @click="openIncomeForm()"><Plus class="size-4" />Приход</Button>
          </div>
          <DataTable :columns="incomeColumns" :rows="visibleIncome" :empty-text="incomeFrom || incomeTo ? 'За выбранный период приходов нет' : 'Приходов пока нет'">
            <template #cell-dateTime="{ row }">{{ dateTime(row) }}</template>
            <template #cell-amount="{ row }">{{ money(row.amount) }} сом</template>
            <template #cell-note="{ row }">{{ row.note || 'Приход' }}</template>
            <template #cell-actions="{ row }">
              <div class="flex justify-end gap-1">
                <Button size="icon" variant="ghost" :aria-label="`Изменить приход на ${money(row.amount)} сом`" @click="openIncomeForm(row)"><Pencil class="size-4 text-blue-600" /></Button>
                <Button size="icon" variant="ghost" :aria-label="`Удалить приход на ${money(row.amount)} сом`" @click="deletingIncome = row"><Trash2 class="size-4 text-destructive" /></Button>
              </div>
            </template>
          </DataTable>
        </div>
        <div v-else class="space-y-4">
          <div class="flex flex-wrap items-end gap-3">
            <label class="grid gap-1 text-sm">Дата от<Input v-model="expenseFrom" type="date" :max="expenseTo || undefined" aria-label="Списания с даты" /></label>
            <label class="grid gap-1 text-sm">Дата до<Input v-model="expenseTo" type="date" :min="expenseFrom || undefined" aria-label="Списания по дату" /></label>
            <Button class="ml-auto" :disabled="!accountRows.length" @click="openExpenseForm()"><Plus class="size-4" />Списание</Button>
          </div>
          <DataTable :columns="incomeColumns" :rows="visibleExpenses" :empty-text="expenseFrom || expenseTo ? 'За выбранный период списаний нет' : 'Списаний пока нет'">
            <template #cell-dateTime="{ row }">{{ dateTime(row) }}</template>
            <template #cell-amount="{ row }">{{ money(row.amount) }} сом</template>
            <template #cell-note="{ row }">{{ row.note || 'Списание' }}</template>
            <template #cell-actions="{ row }">
              <div class="flex justify-end gap-1">
                <Button size="icon" variant="ghost" :aria-label="`Изменить списание на ${money(row.amount)} сом`" @click="openExpenseForm(row)"><Pencil class="size-4 text-blue-600" /></Button>
                <Button size="icon" variant="ghost" :aria-label="`Удалить списание на ${money(row.amount)} сом`" @click="deletingExpense = row"><Trash2 class="size-4 text-destructive" /></Button>
              </div>
            </template>
          </DataTable>
        </div>
      </TabsContent>
    </Tabs>
    <AccountFormDialog v-model:open="accountDialogOpen" :account="editingAccount" @save="saveAccount" />
    <Dialog :open="!!viewingAccount" @update:open="open => { if (!open) viewingAccount = null }">
      <DialogContent v-if="viewingAccount">
        <DialogHeader>
          <DialogTitle>{{ viewingAccount.name }}</DialogTitle>
          <DialogDescription>Информация о счёте</DialogDescription>
        </DialogHeader>
        <p class="text-sm text-muted-foreground">Сумма: <strong class="text-foreground">{{ money(viewingAccount.amount) }} сом</strong></p>
      </DialogContent>
    </Dialog>
    <AlertDialog :open="!!deletingAccount" @update:open="open => { if (!open) deletingAccount = null }">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Удалить счёт?</AlertDialogTitle>
          <AlertDialogDescription>Счёт «{{ deletingAccount?.name }}» будет удалён.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <Button variant="destructive" @click="confirmDeleteAccount">Удалить</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <AccountMovementFormDialog v-model:open="incomeDialogOpen" kind="income" :accounts="accountRows" :movement="editingIncome" @save="saveIncome" />
    <AccountMovementFormDialog v-model:open="expenseDialogOpen" kind="expense" :accounts="accountRows" :movement="editingExpense" @save="saveExpense" />
    <AccountMovementFormDialog v-model:open="transferDialogOpen" kind="transfer" :accounts="accountRows" :movement="editingTransfer" @save-transfer="saveTransfer" />
    <AlertDialog :open="!!deletingIncome" @update:open="updateDeleteDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Удалить приход?</AlertDialogTitle>
          <AlertDialogDescription>Приход будет удалён, а сумма счёта пересчитана.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <Button variant="destructive" @click="removeIncome">Удалить</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <AlertDialog :open="!!deletingExpense" @update:open="updateDeleteDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Удалить списание?</AlertDialogTitle>
          <AlertDialogDescription>Списание будет удалено, а сумма счёта возвращена.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <Button variant="destructive" @click="removeExpense">Удалить</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <AlertDialog :open="!!deletingTransfer" @update:open="updateDeleteDialog">
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
  </section>
</template>
