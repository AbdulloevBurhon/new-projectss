<script setup lang="ts">
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, Info, Pencil, Plus, Trash2, Wallet } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Button, DataTable, Input, Tabs, TabsContent, TabsList, TabsTrigger, toast } from '@obshaya/ui'
import AccountFormDialog from './AccountFormDialog.vue'
import AccountMovementFormDialog from './AccountMovementFormDialog.vue'
import { getAccounts, saveAccounts, type AccountRecord } from '../../../../endpoints/accounts/accounts.service'

type MovementRow = { id: string; date: string; createdAt: string; accountId: string; accountName: string; amount: number; note: string }
type TransferRow = { id: string; date: string; createdAt: string; sourceAccountId: string; sourceAccountName: string; targetAccountId: string; targetAccountName: string; amount: number; note: string }

const activeTab = ref('accounts')
const accountSearch = ref('')
const accountDialogOpen = ref(false)
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
const incomeRows = ref<MovementRow[]>([])
const expenseRows = ref<MovementRow[]>([])
const transferRows = ref<TransferRow[]>([])
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

onMounted(() => {
  try {
    accountRows.value = getAccounts()
  } catch {
    toast.error('Не удалось загрузить счета из хранилища.')
  }
})

function money(amount: number) {
  return new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
}

function saveAccount(draft: { name: string }) {
  const next = [{ id: crypto.randomUUID(), amount: 0, ...draft }, ...accountRows.value]
  try {
    saveAccounts(next)
    accountRows.value = next
  } catch {
    toast.error('Не удалось сохранить счёт.')
    return
  }
  accountDialogOpen.value = false
}

function saveIncome(draft: { date: string; accountId: string; amount: number; note: string }) {
  const account = accountRows.value.find(row => row.id === draft.accountId)
  if (!account) return
  if (editingIncome.value) {
    incomeRows.value = incomeRows.value.map(row => row.id === editingIncome.value!.id
      ? { ...row, ...draft, accountName: account.name }
      : row)
  } else {
    incomeRows.value.unshift({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), accountName: account.name, ...draft })
  }
  editingIncome.value = null
  incomeDialogOpen.value = false
}

function saveExpense(draft: { date: string; accountId: string; amount: number; note: string }) {
  const account = accountRows.value.find(row => row.id === draft.accountId)
  if (!account) return
  if (editingExpense.value) {
    expenseRows.value = expenseRows.value.map(row => row.id === editingExpense.value!.id
      ? { ...row, ...draft, accountName: account.name }
      : row)
  } else {
    expenseRows.value.unshift({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), accountName: account.name, ...draft })
  }
  editingExpense.value = null
  expenseDialogOpen.value = false
}

function saveTransfer(draft: { date: string; sourceAccountId: string; targetAccountId: string; amount: number; note: string }) {
  const source = accountRows.value.find(row => row.id === draft.sourceAccountId)
  const target = accountRows.value.find(row => row.id === draft.targetAccountId)
  if (!source || !target || source.id === target.id) return
  const transfer = { ...draft, sourceAccountName: source.name, targetAccountName: target.name }
  if (editingTransfer.value) {
    transferRows.value = transferRows.value.map(row => row.id === editingTransfer.value!.id ? { ...row, ...transfer } : row)
  } else {
    transferRows.value.unshift({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...transfer })
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

function removeIncome() {
  if (!deletingIncome.value) return
  incomeRows.value = incomeRows.value.filter(row => row.id !== deletingIncome.value!.id)
  deletingIncome.value = null
}

function removeExpense() {
  if (!deletingExpense.value) return
  expenseRows.value = expenseRows.value.filter(row => row.id !== deletingExpense.value!.id)
  deletingExpense.value = null
}

function removeTransfer() {
  if (!deletingTransfer.value) return
  transferRows.value = transferRows.value.filter(row => row.id !== deletingTransfer.value!.id)
  deletingTransfer.value = null
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
          <Button class="ml-auto" @click="accountDialogOpen = true"><Plus class="size-4" />Счёт</Button>
        </div>
        <DataTable :columns="accountColumns" :rows="visibleAccounts" :empty-text="accountSearch.trim() ? 'Совпадений не найдено' : 'Счетов пока нет'">
          <template #cell-amount="{ row }">{{ money(row.amount) }} сом</template>
          <template #cell-actions="{ row }">
            <div class="flex justify-end gap-1">
              <Button size="icon" variant="ghost" :aria-label="`Информация о счёте ${row.name}`"><Info class="size-4 text-sky-600" /></Button>
              <Button size="icon" variant="ghost" :aria-label="`Редактировать счёт ${row.name}`"><Pencil class="size-4 text-blue-600" /></Button>
              <Button size="icon" variant="ghost" :aria-label="`Удалить счёт ${row.name}`"><Trash2 class="size-4 text-destructive" /></Button>
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
    <AccountFormDialog v-model:open="accountDialogOpen" @save="saveAccount" />
    <AccountMovementFormDialog v-model:open="incomeDialogOpen" kind="income" :accounts="accountRows" :movement="editingIncome" @save="saveIncome" />
    <AccountMovementFormDialog v-model:open="expenseDialogOpen" kind="expense" :accounts="accountRows" :movement="editingExpense" @save="saveExpense" />
    <AccountMovementFormDialog v-model:open="transferDialogOpen" kind="transfer" :accounts="accountRows" :movement="editingTransfer" @save-transfer="saveTransfer" />
    <AlertDialog :open="!!deletingIncome" @update:open="updateDeleteDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Удалить приход?</AlertDialogTitle>
          <AlertDialogDescription>Операция будет удалена из текущего списка.</AlertDialogDescription>
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
          <AlertDialogDescription>Операция будет удалена из текущего списка.</AlertDialogDescription>
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
          <AlertDialogDescription>Операция будет удалена из текущего списка.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <Button variant="destructive" @click="removeTransfer">Удалить</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>
</template>
