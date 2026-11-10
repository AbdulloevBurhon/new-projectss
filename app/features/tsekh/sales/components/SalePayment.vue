<script setup lang="ts">
import WorkshopDialog from '~/features/tsekh/components/WorkshopDialog.vue'
import type { Account } from '~/features/tsekh/accounts/types/accounts'
import { parseAmount } from '~/features/tsekh/accounts/utils/ledger'
import ClientEditor from '~/features/tsekh/clients/components/ClientEditor.vue'
import ClientPicker from '~/features/tsekh/clients/components/ClientPicker.vue'
import { useClients } from '~/features/tsekh/clients/stores/useClients'
import { money } from '~/features/tsekh/warehouse/utils/format'

const props = defineProps<{ accounts: Account[]; total: number; quantity?: number;
  pay: (accountId: string, amount: number | string, clientId: string, price: number | string) => Promise<void> }>()
const emit = defineEmits<{ close: []; paid: [] }>()
const accountId = ref(props.accounts.length === 1 ? props.accounts[0]!.id : '')
const { clients, error: clientError, load, sync } = useClients()
const clientId = ref('')
const addingClient = ref(false)
const price = ref<number | string>(props.total / (props.quantity ?? 1) / 100)
const entry = ref<{ field: 'amount' | 'debt'; value: number | string }>({ field: 'debt', value: 0 })
const error = ref('')
const busy = ref(false)
function cents(value: number | string) {
  try {
    return parseAmount(value, 0, Infinity)
  } catch {
    return undefined
  }
}
const saleTotal = computed(() => {
  const unitCents = cents(price.value)
  if (unitCents === undefined) return
  const total = unitCents * (props.quantity ?? 1)
  if (Number.isSafeInteger(total)) return total
})
const enteredCents = computed(() => cents(entry.value.value))
const remainder = computed(() => saleTotal.value !== undefined && enteredCents.value !== undefined && enteredCents.value <= saleTotal.value
  ? (saleTotal.value - enteredCents.value) / 100 : '')
const amount = computed({
  get: () => entry.value.field === 'amount' ? entry.value.value : remainder.value,
  set: value => { entry.value = { field: 'amount', value } },
})
const debt = computed({
  get: () => !clientId.value ? 0 : entry.value.field === 'debt' ? entry.value.value : remainder.value,
  set: value => { entry.value = { field: 'debt', value } },
})
const invalidAmount = computed(() => saleTotal.value === undefined || enteredCents.value === undefined || enteredCents.value > saleTotal.value)
const needsClient = computed(() => !clientId.value && !invalidAmount.value && cents(amount.value) !== saleTotal.value)
const maximum = computed(() => saleTotal.value === undefined ? undefined : saleTotal.value / 100)

watch(clientId, id => {
  if (!id && entry.value.field === 'debt') entry.value = { field: 'amount', value: amount.value }
})
watch(price, () => { if (!clientId.value) entry.value = { field: 'debt', value: 0 } })

onMounted(() => {
  load()
  window.addEventListener('storage', sync)
})
onBeforeUnmount(() => window.removeEventListener('storage', sync))

async function submit() {
  if (busy.value || invalidAmount.value || needsClient.value) return
  busy.value = true
  error.value = ''
  try {
    await props.pay(accountId.value, amount.value, clientId.value, price.value)
    emit('paid')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось провести продажу.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <WorkshopDialog title="Оплата продажи" class="sales-payment-dialog" :busy="busy" @close="$emit('close')">
    <form class="dialog-content" @submit.prevent="submit">
      <label class="inventory-field">Счёт
        <select v-model="accountId" required :disabled="busy" autofocus>
          <option value="" disabled>Выберите счёт</option>
          <option v-for="account in accounts" :key="account.id" :value="account.id">{{ account.name }}</option>
        </select>
      </label>
      <ClientPicker v-model="clientId" :clients="clients" :disabled="busy || !!clientError" @add="addingClient = true" />
      <p v-if="clientError" class="inventory-muted" role="status">{{ clientError }}</p>
      <div class="sales-payment-total">
        <div class="sales-payment-fields">
          <label class="inventory-field">{{ quantity ? 'Цена двери, сом' : 'Цена продажи, сом' }}
            <input v-model="price" type="number" min="0" step="0.01" inputmode="decimal" required :disabled="busy" />
          </label>
          <label class="inventory-field">Оплачено, сом
            <input v-model="amount" type="number" min="0" :max="maximum" step="0.01" inputmode="decimal" required :disabled="busy" />
          </label>
          <label class="inventory-field">Долг, сом
            <input v-model="debt" type="number" min="0" :max="maximum" step="0.01" inputmode="decimal" required :disabled="busy || !clientId" />
          </label>
        </div>
        <div v-if="quantity && quantity > 1" class="sales-payment-price"><span>Итого за {{ quantity }} шт</span><strong>{{ maximum === undefined ? '—' : money(maximum) }}</strong></div>
        <small v-if="needsClient" class="inventory-muted">Для частичной оплаты выберите клиента.</small>
        <small v-else-if="maximum !== undefined && invalidAmount && entry.value !== ''" class="inventory-muted">Укажите сумму от 0 до {{ money(maximum) }} с точностью до двух знаков.</small>
        <small v-else-if="!clientId" class="inventory-muted">Выберите клиента, чтобы записать долг.</small>
      </div>
      <p v-if="error" class="inventory-message error" role="alert">{{ error }}</p>
      <div class="dialog-actions">
        <button type="button" class="inventory-button secondary" :disabled="busy" @click="$emit('close')">Отмена</button>
        <button type="submit" class="inventory-button primary" :disabled="busy || !accounts.length || invalidAmount || needsClient">Подтвердить оплату</button>
      </div>
    </form>
    <ClientEditor v-if="addingClient" :deleting="false" @saved="clientId = $event" @close="addingClient = false" />
  </WorkshopDialog>
</template>
