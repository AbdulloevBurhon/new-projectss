<script setup lang="ts">
import WorkshopTable from '~/features/tsekh/components/WorkshopTable.vue'
import InventoryIcon from '~/features/tsekh/components/WorkshopIcon.vue'
import { useAccounts } from '~/features/tsekh/accounts/stores/useAccounts'
import ReceiptProductRow from './ReceiptProductRow.vue'
import { useInventory } from '../stores/useInventory'
import { lineTotal, matchesName, money } from '../utils/format'
import type { ReceiptInputs } from '../utils/receipts'
import { warehouseKind } from '../utils/warehouse-kind'

const { inventory, saveReceipt } = useInventory()
const accounts = useAccounts()
const warehouseId = ref('')
const accountId = ref('')
const search = ref('')
const busy = ref(false)
const error = ref('')
const saved = ref(false)
const draft = reactive<Record<string, ReceiptInputs>>({})
const balance = computed(() => accounts.balances.value.get(accountId.value))
const materialWarehouses = computed(() => inventory.value.warehouses.filter(item => warehouseKind(item) === 'materials'))
watch(materialWarehouses, (warehouses) => {
  if (!warehouses.some(warehouse => warehouse.id === warehouseId.value)) {
    warehouseId.value = warehouses.length === 1 ? warehouses[0]!.id : ''
  }
}, { immediate: true })

watch(() => accounts.ledger.value.accounts, (items) => {
  if (!items.some(item => item.id === accountId.value)) {
    accountId.value = items.length === 1 ? items[0]!.id : ''
  }
}, { immediate: true })

watch(() => inventory.value.products, (products) => {
  for (const product of products) draft[product.id] ??= { quantity: '', price: '' }
}, { immediate: true })

const visible = computed(() => inventory.value.products.filter(product => matchesName(product.name, search.value)).map(product => {
  const input = draft[product.id]!
  return { product, input, sum: lineTotal(Number(input.quantity), Number(input.price)) }
}))

function reset(productId: string) {
  draft[productId] = { quantity: '', price: '' }
}

async function submit(productId: string, input: ReceiptInputs) {
  if (busy.value || !warehouseId.value || !accountId.value) return
  busy.value = true
  error.value = ''
  saved.value = false
  try {
    await saveReceipt(warehouseId.value, accountId.value, {
      productId,
      quantity: Number(input.quantity),
      unitPrice: Number(input.price),
    })
    accounts.load()
    reset(productId)
    saved.value = true
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось провести поступление.'
  } finally {
    busy.value = false
  }
}

onMounted(() => {
  accounts.load()
  window.addEventListener('storage', accounts.sync)
})
onBeforeUnmount(() => window.removeEventListener('storage', accounts.sync))
</script>

<template>
  <div v-if="saved" class="inventory-message success" role="status">
    <InventoryIcon name="check" /> Поступление проведено. Сумма списана со счёта.
    <NuxtLink to="/tsekh/warehouse/history">Открыть историю</NuxtLink>
  </div>
  <section class="inventory-panel" @input="saved = false">
    <div class="panel-filters receipt-filters">
      <label class="inventory-field">Склад
        <select v-model="warehouseId" :disabled="busy" required>
          <option value="" disabled>Выберите склад</option>
          <option v-for="warehouse in materialWarehouses" :key="warehouse.id" :value="warehouse.id">{{ warehouse.name }}</option>
        </select>
      </label>
      <div class="receipt-payment-fields">
        <label class="inventory-field">Счёт
          <select v-model="accountId" :disabled="busy || !accounts.ready.value || !!accounts.error.value">
            <option value="" disabled>Выберите счёт</option>
            <option v-for="account in accounts.ledger.value.accounts" :key="account.id" :value="account.id">{{ account.name }}</option>
          </select>
        </label>
        <div v-if="balance !== undefined && !accounts.error.value" class="receipt-account-balance" aria-live="polite">
          <span>Остаток счёта</span><strong>{{ money(balance / 100) }}</strong>
        </div>
      </div>
      <label class="inventory-field">Товар
        <span class="inventory-search"><InventoryIcon name="search" /><input v-model="search" type="search" placeholder="Поиск по названию" /></span>
      </label>
    </div>
    <div v-if="!materialWarehouses.length" class="panel-note">Сначала <NuxtLink to="/tsekh/warehouse">добавьте склад материалов</NuxtLink>.</div>
    <p v-if="accounts.error.value" class="panel-note" role="alert">{{ accounts.error.value }}</p>
    <p v-else-if="accounts.ready.value && !accounts.ledger.value.accounts.length" class="panel-note">Сначала <NuxtLink to="/tsekh/accounts">добавьте счёт</NuxtLink>.</p>
    <p v-if="error" class="inventory-message error receipt-error" role="alert">{{ error }}</p>
    <WorkshopTable :rows="visible" :reset-key="JSON.stringify([warehouseId, search])" table-class="receipt-table" v-slot="{ pageRows }">
      <thead><tr><th scope="col">Товар</th><th scope="col">Количество</th><th scope="col">Цена за единицу</th><th scope="col" class="numeric-cell">Сумма</th><th scope="col" class="table-actions">Действия</th></tr></thead>
      <tbody>
        <ReceiptProductRow v-for="{ product, input, sum } in pageRows" :key="product.id" :product="product"
          :input="input" :sum="sum" :balance="balance" :disabled="busy" :can-select="!!warehouseId && !accounts.error.value"
          @reset="reset(product.id)" @post="submit(product.id, input)" />
        <tr v-if="!visible.length"><td colspan="5" class="table-empty">
          <template v-if="inventory.products.length">Совпадений не найдено</template>
          <template v-else>Сначала <NuxtLink to="/tsekh/warehouse/products">добавьте товары</NuxtLink>.</template>
        </td></tr>
      </tbody>
    </WorkshopTable>
  </section>
</template>
