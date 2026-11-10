<script setup lang="ts">
import WorkshopHeader from '~/features/tsekh/components/WorkshopHeader.vue'
import WorkshopIcon from '~/features/tsekh/components/WorkshopIcon.vue'
import type { CartLine, SaleItem } from '../types/sales'
import { useSales } from '../stores/useSales'
import SalePayment from './SalePayment.vue'
import SalesCart from './SalesCart.vue'
import SalesCatalog from './SalesCatalog.vue'
import SalesHistory from './SalesHistory.vue'

const route = useRoute()
const { ledger, ready, error, sourceError, products, history, load, loadSources, sync, checkout, cancelSale } = useSales()
const showingHistory = computed(() => route.query.tab === 'history')
const selection = ref<CartLine[]>([])
const payment = ref<CartLine[]>()
const notice = ref('')
const cart = computed(() => selection.value.map(line => ({
  ...line, item: products.value.find(item => item.id === line.item.id) ?? { ...line.item, available: 0 },
})))
const total = computed(() => sum(cart.value))
const canPay = computed(() => !!ledger.value.accounts.length && !!cart.value.length
  && cart.value.every(line => line.quantity <= line.item.available))

function sum(lines: CartLine[]) {
  return lines.reduce((amount, line) => amount + line.item.unitCents * line.quantity, 0)
}

function adjust(id: string, delta: number) {
  const line = selection.value.find(entry => entry.item.id === id)
  if (!line) return
  const available = products.value.find(item => item.id === id)?.available ?? 0
  if (delta > 0 && line.quantity >= available) return
  line.quantity += delta
  if (line.quantity <= 0) selection.value = selection.value.filter(item => item !== line)
  notice.value = ''
}

function add(item: SaleItem) {
  if (!item.available) return
  if (selection.value.some(line => line.item.id === item.id)) adjust(item.id, 1)
  else selection.value.push({ item, quantity: 1 })
  notice.value = ''
}

function startPayment() {
  if (canPay.value) payment.value = cart.value
}

function closePayment() {
  payment.value = undefined
  loadSources()
}

function paid() {
  selection.value = []
  closePayment()
  notice.value = 'Продажа сохранена.'
}

onMounted(() => {
  load()
  window.addEventListener('storage', sync)
})
onBeforeUnmount(() => window.removeEventListener('storage', sync))
</script>

<template>
  <WorkshopHeader section="Управление цехом" title="Продажи" description="Выберите изделия, оформите оплату и просмотрите историю продаж." icon="sales">
    <nav class="inventory-tabs" aria-label="Вкладки продаж">
      <NuxtLink to="/tsekh/sales" :class="{ 'is-current': !showingHistory }" :aria-current="showingHistory ? undefined : 'page'" aria-current-value="false">Продажа</NuxtLink>
      <NuxtLink to="/tsekh/sales?tab=history" :class="{ 'is-current': showingHistory }" :aria-current="showingHistory ? 'page' : undefined" aria-current-value="false">История</NuxtLink>
    </nav>

    <p v-if="error" class="inventory-message error" role="alert">{{ error }}</p>
    <p v-else-if="!ready" class="inventory-muted" role="status">Загрузка продаж…</p>
    <SalesHistory v-else-if="showingHistory" :history="history" :cancel="cancelSale" />
    <p v-else-if="sourceError" class="inventory-message error" role="alert">{{ sourceError }}</p>
    <template v-else>
      <p v-if="notice" class="inventory-message success" role="status"><WorkshopIcon name="check" /> {{ notice }}</p>
      <div class="sales-layout">
        <SalesCart :lines="cart" :total="total" :can-pay="canPay" :has-accounts="!!ledger.accounts.length" @adjust="adjust" @pay="startPayment" />
        <SalesCatalog :products="products" :cart="cart" @add="add" />
      </div>
    </template>

    <SalePayment v-if="payment" :accounts="ledger.accounts" :total="sum(payment)"
      :quantity="payment.length === 1 ? payment[0]?.quantity : undefined"
      :pay="(id, amount, clientId, price) => checkout(id, payment!, amount, clientId, price)"
      @close="closePayment" @paid="paid" />
  </WorkshopHeader>
</template>
