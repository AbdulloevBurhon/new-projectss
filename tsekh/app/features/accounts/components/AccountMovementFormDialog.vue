<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label } from '@obshaya/ui'

type AccountOption = { id: string; name: string }
type MovementDraft = { date: string; accountId: string; amount: number; note: string }
type Movement = MovementDraft & { id: string; createdAt: string; accountName: string }
type TransferDraft = { date: string; sourceAccountId: string; targetAccountId: string; amount: number; note: string }
type Transfer = TransferDraft & { id: string; createdAt: string; sourceAccountName: string; targetAccountName: string }

const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ kind: 'income' | 'expense' | 'transfer'; accounts: AccountOption[]; movement: Movement | Transfer | null }>()
const emit = defineEmits<{ save: [draft: MovementDraft]; saveTransfer: [draft: TransferDraft] }>()
const actionName = computed(() => props.kind === 'income' ? 'приход' : props.kind === 'expense' ? 'списание' : 'перевод')
const date = ref('')
const accountId = ref('')
const sourceAccountId = ref('')
const targetAccountId = ref('')
const amount = ref<number | string>('')
const note = ref('')

function localDate() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

watch(open, (isOpen) => {
  if (!isOpen) return
  date.value = props.movement?.date ?? localDate()
  accountId.value = props.kind !== 'transfer' && props.movement && 'accountId' in props.movement
    ? props.movement.accountId
    : (props.kind !== 'transfer' && props.accounts.length === 1 ? props.accounts[0]!.id : '')
  sourceAccountId.value = props.kind === 'transfer' ? ('sourceAccountId' in (props.movement ?? {}) ? (props.movement as Transfer).sourceAccountId : props.accounts[0]?.id ?? '') : ''
  targetAccountId.value = props.kind === 'transfer' ? ('targetAccountId' in (props.movement ?? {}) ? (props.movement as Transfer).targetAccountId : props.accounts[1]?.id ?? '') : ''
  amount.value = props.movement?.amount ?? ''
  note.value = props.movement?.note ?? ''
})

function submit() {
  const parsedAmount = Number(amount.value)
  if (props.kind === 'transfer') {
    if (!date.value || !sourceAccountId.value || !targetAccountId.value || sourceAccountId.value === targetAccountId.value || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return
    emit('saveTransfer', { date: date.value, sourceAccountId: sourceAccountId.value, targetAccountId: targetAccountId.value, amount: parsedAmount, note: note.value.trim() })
    return
  }
  if (!date.value || !accountId.value || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return
  emit('save', { date: date.value, accountId: accountId.value, amount: parsedAmount, note: note.value.trim() })
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ movement ? `Изменить ${actionName}` : `Добавить ${actionName}` }}</DialogTitle>
        <DialogDescription>Укажите счёт, дату, сумму и заметку.</DialogDescription>
      </DialogHeader>
      <form class="space-y-4" @submit.prevent="submit">
        <div v-if="kind !== 'transfer'" class="space-y-2">
          <Label for="income-account">Счёт</Label>
          <select id="income-account" v-model="accountId" class="h-10 w-full rounded-md border bg-background px-3 text-sm" required>
            <option value="" disabled>Выберите счёт</option>
            <option v-for="account in accounts" :key="account.id" :value="account.id">{{ account.name }}</option>
          </select>
        </div>
        <div v-else class="grid gap-3 sm:grid-cols-2">
          <div class="space-y-2">
            <Label for="transfer-source-account">Со счёта</Label>
            <select id="transfer-source-account" v-model="sourceAccountId" class="h-10 w-full rounded-md border bg-background px-3 text-sm" required>
              <option value="" disabled>Выберите счёт</option>
              <option v-for="account in accounts" :key="account.id" :value="account.id" :disabled="account.id === targetAccountId">{{ account.name }}</option>
            </select>
          </div>
          <div class="space-y-2">
            <Label for="transfer-target-account">На счёт</Label>
            <select id="transfer-target-account" v-model="targetAccountId" class="h-10 w-full rounded-md border bg-background px-3 text-sm" required>
              <option value="" disabled>Выберите счёт</option>
              <option v-for="account in accounts" :key="account.id" :value="account.id" :disabled="account.id === sourceAccountId">{{ account.name }}</option>
            </select>
          </div>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="space-y-2"><Label for="income-date">Дата</Label><Input id="income-date" v-model="date" type="date" required /></div>
          <div class="space-y-2"><Label for="income-amount">Сумма, сом</Label><Input id="income-amount" v-model="amount" type="number" min="0.01" max="1000000" step="0.01" required placeholder="0,00" /></div>
        </div>
        <div class="space-y-2"><Label for="income-note">Заметка / цель</Label><Input id="income-note" v-model="note" maxlength="240" :placeholder="kind === 'transfer' ? 'Примечание к переводу' : 'Например, внесение наличных'" /></div>
        <DialogFooter>
          <Button type="button" variant="outline" @click="open = false">Отмена</Button>
          <Button type="submit" :disabled="!date || !amount || (kind === 'transfer' ? !sourceAccountId || !targetAccountId || sourceAccountId === targetAccountId : !accountId)">{{ movement ? 'Сохранить' : `Добавить ${actionName}` }}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
