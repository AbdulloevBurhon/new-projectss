<script setup lang="ts">
import WorkshopTable from '~/features/tsekh/components/WorkshopTable.vue'
import InventoryIcon from '~/features/tsekh/components/WorkshopIcon.vue'
import { workersStorageKey } from '~/features/tsekh/workers/services/workers-storage'
import { useWorkers } from '~/features/tsekh/workers/stores/useWorkers'
import { operationDateTime } from '~/features/tsekh/utils/operation-date'
import { useInventory } from '../stores/useInventory'
import { money, quantity } from '../utils/format'
import { warehouseHistory } from '../utils/warehouse-history'

const { inventory } = useInventory()
const { workers, ready, storageError, load } = useWorkers()
const warehouseId = ref('')
const from = ref('')
const to = ref('')
const operations = computed(() => warehouseHistory(inventory.value, workers.value))
const warehouses = computed(() => {
  const options = new Map(operations.value.map(item => [item.warehouseId, item.warehouseName]))
  for (const warehouse of inventory.value.warehouses) options.set(warehouse.id, warehouse.name)
  return Array.from(options)
})
const visible = computed(() => operations.value.filter(item =>
  (!warehouseId.value || item.warehouseId === warehouseId.value)
  && (!from.value || item.date >= from.value) && (!to.value || item.date <= to.value),
))
const rows = computed(() => visible.value.flatMap(item => item.lines.map((line, index) => ({
  item, line, key: `${item.id}-${index}`,
}))))
const receipts = computed(() => visible.value.filter(item => item.kind === 'receipt'))
const expenses = computed(() => visible.value.length - receipts.value.length)
const total = computed(() => receipts.value.flatMap(item => item.lines).reduce((sum, line) => sum + (line.costCents ?? 0), 0) / 100)

function sync(event: StorageEvent) {
  if (event.key === workersStorageKey || event.key === null) load()
}

onMounted(() => {
  load()
  window.addEventListener('storage', sync)
})
onBeforeUnmount(() => window.removeEventListener('storage', sync))

function reset() {
  warehouseId.value = ''
  from.value = ''
  to.value = ''
}
</script>

<template>
  <p v-if="storageError" class="inventory-message error" role="alert">Не удалось загрузить расход материалов.</p>
  <p v-else-if="!ready" class="inventory-muted" role="status">Загрузка истории склада…</p>
  <template v-else>
    <div class="inventory-metrics">
      <div class="inventory-metric"><span class="metric-icon" data-color="warehouses"><InventoryIcon name="receipts" /></span><span><small>Поступления</small><strong>{{ receipts.length }}</strong></span></div>
      <div class="inventory-metric"><span class="metric-icon" data-color="products"><InventoryIcon name="products" /></span><span><small>Расходы</small><strong>{{ expenses }}</strong></span></div>
      <div class="inventory-metric"><span class="metric-icon" data-color="receipts"><InventoryIcon name="balance" /></span><span><small>Сумма поступлений</small><strong>{{ money(total) }}</strong></span></div>
    </div>
    <section class="inventory-panel">
      <div class="panel-filters">
        <label class="inventory-field">Склад
          <select v-model="warehouseId"><option value="">Все склады</option><option v-for="[id, name] in warehouses" :key="id" :value="id">{{ name }}</option></select>
        </label>
        <label class="inventory-field">С даты<input v-model="from" type="date" :max="to || undefined" /></label>
        <label class="inventory-field">По дату<input v-model="to" type="date" :min="from || undefined" /></label>
        <button v-if="from || to || warehouseId" type="button" class="inventory-button secondary" @click="reset">Сбросить</button>
      </div>
      <WorkshopTable :rows="rows" :reset-key="JSON.stringify([warehouseId, from, to])" v-slot="{ pageRows }">
        <thead><tr><th scope="col">Операция, дата и время</th><th scope="col">Товар</th><th scope="col">Склад</th><th scope="col">Рабочий</th><th scope="col" class="numeric-cell">Количество</th><th scope="col" class="numeric-cell">Сумма</th></tr></thead>
        <tbody>
          <tr v-for="{ item, line, key } in pageRows" :key="key">
            <td><strong>{{ item.kind === 'receipt' ? 'Поступление' : 'Расход' }}</strong><small class="table-secondary">{{ operationDateTime(item.date, item.createdAt) }}</small></td>
            <td>{{ line.productName }}</td>
            <td>{{ item.warehouseName }}</td>
            <td>{{ item.workerName ?? '—' }}<small v-if="item.techcardName" class="table-secondary">{{ item.techcardName }}</small></td>
            <td class="numeric-cell">
              <span class="inventory-tag" :class="{ positive: item.kind === 'receipt' }">{{ item.kind === 'receipt' ? '+' : '−' }}{{ quantity(line.quantity) }} {{ line.unit }}</span>
              <small v-if="line.stockQuantity !== undefined" class="table-secondary">{{ quantity(line.stockQuantity) }} {{ line.stockUnit }}</small>
            </td>
            <td class="numeric-cell">{{ line.costCents === undefined ? '—' : money(line.costCents / 100) }}</td>
          </tr>
          <tr v-if="!rows.length"><td colspan="6" class="table-empty">{{ operations.length ? 'По выбранным фильтрам операций нет' : 'Операций пока нет' }}</td></tr>
        </tbody>
      </WorkshopTable>
    </section>
  </template>
</template>
