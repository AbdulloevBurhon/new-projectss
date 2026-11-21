<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label } from '@obshaya/ui'
import { getAccounts } from '../../../../endpoints/accounts/get-accounts/service'
import type { AccountRecord } from '../../../../endpoints/accounts/get-accounts/types'
import { payClientDebt } from '../../../../endpoints/sales/client-history'
import { cents, money, type Client } from '../../../../endpoints/sales/service'

const props = defineProps<{ client: Client }>()
const emit = defineEmits<{ close: []; paid: [] }>()
const id = crypto.randomUUID()
const accounts = ref<AccountRecord[]>([])
const account = ref('')
const amount = ref<number | string>('')
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const debt = computed(() => cents(props.client.debt))
const amountCents = computed(() => cents(Number(amount.value)))
const valid = computed(() => !!account.value && Number.isSafeInteger(amountCents.value)
  && amountCents.value > 0 && amountCents.value <= debt.value && amountCents.value / 100 === Number(amount.value))
const remaining = computed(() => Math.max(0, debt.value - (Number.isSafeInteger(amountCents.value) && amountCents.value > 0 ? amountCents.value : 0)))

onMounted(async () => {
  try {
    accounts.value = await getAccounts()
    if (accounts.value.length === 1) account.value = accounts.value[0]!.id
  } catch {
    error.value = 'Не удалось загрузить счета.'
  } finally {
    loading.value = false
  }
})

async function submit() {
  if (!valid.value || busy.value) return
  busy.value = true
  error.value = ''
  try {
    await payClientDebt(props.client.id, id, account.value, amountCents.value)
    emit('paid')
  } catch (cause) {
    const response = cause as { data?: { statusMessage?: string; message?: string } }
    error.value = response.data?.statusMessage || response.data?.message || 'Не удалось подтвердить оплату. Повторите с теми же данными.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <Dialog :open="true" @update:open="open => { if (!open && !busy) emit('close') }">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Погашение долга</DialogTitle>
        <DialogDescription>{{ client.name }} · {{ client.phone }}</DialogDescription>
      </DialogHeader>
      <form class="grid gap-4" @submit.prevent="submit">
        <div class="rounded-lg border p-3">
          <div class="text-sm text-muted-foreground">Текущий долг</div>
          <strong class="text-lg tabular-nums">{{ money(debt) }}</strong>
        </div>
        <div class="grid gap-2">
          <Label for="client-debt-account">Счёт зачисления</Label>
          <select id="client-debt-account" v-model="account" :disabled="loading || busy || !accounts.length"
            class="h-10 w-full rounded-md border bg-background px-3 text-sm" required>
            <option value="">{{ loading ? 'Загрузка счетов…' : 'Выберите счёт' }}</option>
            <option v-for="item in accounts" :key="item.id" :value="item.id">{{ item.name }}</option>
          </select>
          <p v-if="!loading && !accounts.length && !error" class="text-sm text-muted-foreground">Сначала добавьте счёт.</p>
        </div>
        <div class="grid gap-2">
          <Label for="client-debt-amount">Сумма оплаты, сом</Label>
          <Input id="client-debt-amount" v-model.number="amount" type="number" min="0.01" :max="debt / 100"
            step="0.01" inputmode="decimal" :disabled="busy" required />
          <p class="text-sm text-muted-foreground">Остаток после оплаты <strong>{{ money(remaining) }}</strong></p>
        </div>
        <p v-if="error" role="alert" class="text-sm text-destructive">{{ error }}</p>
        <DialogFooter>
          <Button type="button" variant="outline" :disabled="busy" @click="emit('close')">Отмена</Button>
          <Button type="submit" :disabled="!valid || busy">{{ busy ? 'Сохранение…' : 'Принять оплату' }}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
