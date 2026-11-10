<script setup lang="ts">
import WorkshopTable from '~/features/tsekh/components/WorkshopTable.vue'
import InventoryIcon from '~/features/tsekh/components/WorkshopIcon.vue'
import { useAccounts } from '~/features/tsekh/accounts/stores/useAccounts'
import { useWorkers } from '~/features/tsekh/workers/stores/useWorkers'
import { workersStorageKey } from '~/features/tsekh/workers/services/workers-storage'
import { useInventory } from '../stores/useInventory'
import { matchesName, quantity } from '../utils/format'
import { countPieces, materialStock } from '../utils/material-stock'
import { finishedStock, finishedWarehouseName, unassignedWarehouse, unassignedWarehouseName } from '../utils/finished-stock'
import { warehouseKind, warehouseKinds } from '../utils/warehouse-kind'
import FinishedBalanceTable from './FinishedBalanceTable.vue'

const { inventory } = useInventory()
const { workers, ready, storageError, load } = useWorkers()
const { ledger, error: accountError, load: loadAccounts, sync: syncAccounts } = useAccounts()
const search = ref('')
const warehouseId = ref('')
const selectedWarehouse = computed(() => inventory.value.warehouses.find(item => item.id === warehouseId.value))
const showingMaterials = computed(() => warehouseId.value !== unassignedWarehouse && warehouseKind(selectedWarehouse.value) === 'materials')
const finished = computed(() => [...finishedStock(workers.value, ledger.value.movements).values()].filter(item => item.available > 0))
const hasUnassigned = computed(() => finished.value.some(item => !item.warehouseId))
const finishedRows = computed(() => {
  const names = new Map(inventory.value.techcards.map(card => [card.id, card.name]))
  return finished.value
    .filter(item => !warehouseId.value || (item.warehouseId ?? unassignedWarehouse) === warehouseId.value)
    .map(item => ({ ...item, name: names.get(item.techcardId) ?? item.name, warehouseName: finishedWarehouseName(item.warehouseId, inventory.value.warehouses) }))
    .filter(item => matchesName(item.name, search.value))
})
const filterKey = computed(() => JSON.stringify([warehouseId.value, search.value]))
const totals = computed(() => materialStock(inventory.value, workers.value, warehouseId.value))
const stockByWarehouse = computed(() => {
  if (warehouseId.value) return [totals.value]
  const ids = [...inventory.value.warehouses.map(item => item.id), null]
  return ids.map(id => materialStock(inventory.value, workers.value, id))
})
const products = computed(() => inventory.value.products
  .filter(product => matchesName(product.name, search.value))
  .map(product => {
    const stock = (totals.value.get(product.id) ?? 0) / 1000
    const pieces = product.quantityPerPiece
      ? countPieces(product.quantityPerPiece, stockByWarehouse.value.map(warehouse => warehouse.get(product.id) ?? 0))
      : stock
    return { ...product, stock, pieces }
  }),
)

function sync(event: StorageEvent) {
  if (event.key === workersStorageKey || event.key === null) load()
  syncAccounts(event)
}

onMounted(() => {
  load()
  loadAccounts()
  window.addEventListener('storage', sync)
})
onBeforeUnmount(() => window.removeEventListener('storage', sync))
</script>

<template>
  <p v-if="storageError" class="inventory-message error" role="alert">Не удалось загрузить расход материалов.</p>
  <p v-else-if="!ready" class="inventory-muted" role="status">Загрузка остатков…</p>
  <section v-else class="inventory-panel">
    <div class="panel-filters">
      <label class="inventory-field">Склад
        <select v-model="warehouseId">
          <option value="">Все склады</option>
          <option v-for="warehouse in inventory.warehouses" :key="warehouse.id" :value="warehouse.id">{{ warehouse.name }} · {{ warehouseKinds[warehouseKind(warehouse)] }}</option>
          <option v-if="hasUnassigned || warehouseId === unassignedWarehouse" :value="unassignedWarehouse">{{ unassignedWarehouseName }}</option>
        </select>
      </label>
      <label class="inventory-field">Название
        <span class="inventory-search"><InventoryIcon name="search" /><input v-model="search" type="search" placeholder="Поиск по названию" /></span>
      </label>
    </div>
    <WorkshopTable v-if="showingMaterials" :rows="products" :reset-key="filterKey" v-slot="{ pageRows }">
      <thead><tr><th scope="col">Товар</th><th scope="col">Ед. изм.</th><th scope="col" class="numeric-cell">Остаток</th><th scope="col" class="numeric-cell">Остаток содержимого</th></tr></thead>
      <tbody>
        <tr v-for="product in pageRows" :key="product.id">
          <td><span class="table-item"><span class="table-icon"><InventoryIcon name="products" /></span><strong>{{ product.name }}</strong></span></td>
          <td>{{ product.unit }}</td>
          <td class="numeric-cell"><span class="inventory-tag" :class="{ positive: product.pieces > 0 }">{{ quantity(product.pieces) }} {{ product.unit }}</span></td>
          <td class="numeric-cell">{{ product.contentUnit ? `${quantity(product.stock)} ${product.contentUnit}` : '—' }}</td>
        </tr>
        <tr v-if="!products.length"><td colspan="4" class="table-empty">{{ search.trim() ? 'Совпадений не найдено' : 'Товаров пока нет' }}</td></tr>
      </tbody>
    </WorkshopTable>
    <p v-if="accountError && (!warehouseId || !showingMaterials)" class="panel-note" role="alert">Не удалось рассчитать остаток готовых изделий.</p>
    <FinishedBalanceTable v-else-if="finishedRows.length || !showingMaterials" :rows="finishedRows" :reset-key="filterKey" />
  </section>
</template>
