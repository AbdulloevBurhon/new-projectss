<script setup lang="ts">
import WorkshopDialog from '~/features/tsekh/components/WorkshopDialog.vue'
import { useAccounts } from '~/features/tsekh/accounts/stores/useAccounts'
import { readInventory } from '~/features/tsekh/warehouse/services/inventory-storage'
import type { Inventory, TechCard } from '~/features/tsekh/warehouse/types/inventory'
import { localDate } from '~/features/tsekh/warehouse/utils/format'
import { trackedMaterials } from '~/features/tsekh/warehouse/utils/material-stock'
import { useWorkers } from '../stores/useWorkers'
import type { WorkLineDraft, Worker } from '../types/workers'
import { workQuantity, workTotalCents } from '../utils/work-amount'
import WorkEntryCards from './WorkEntryCards.vue'
import WorkMaterialDialog from './WorkMaterialDialog.vue'
import WorkPaymentSummary from './WorkPaymentSummary.vue'
import WorkWarehouseFields from './WorkWarehouseFields.vue'

const props = defineProps<{ workers: Worker[] }>()
const emit = defineEmits<{ close: [] }>()
const { savePaidWork } = useWorkers()
const { ledger, balances, error: accountError, load: loadAccounts, sync: syncAccounts } = useAccounts()
const inventory = shallowRef<Inventory>()
const workerId = ref('')
const lines = ref<WorkLineDraft[]>([])
const date = ref(localDate(new Date().toISOString()))
const warehouseId = ref('')
const finishedWarehouseId = ref('')
const accountId = ref('')
const busy = ref(false)
const error = ref('')
const materialCard = ref<TechCard>()
const cards = computed(() => inventory.value?.techcards ?? [])
const previewQuantity = computed(() => workQuantity(lines.value.find(line => line.techcardId === materialCard.value?.id)?.quantity ?? 1) ?? 1)
const needsWarehouse = computed(() => lines.value.some(line =>
  trackedMaterials(cards.value.find(card => card.id === line.techcardId), inventory.value?.products ?? []).length))
const total = computed(() => workTotalCents(lines.value))
const balance = computed(() => balances.value.get(accountId.value))
const insufficient = computed(() => total.value !== undefined && balance.value !== undefined && total.value > 0 && total.value > balance.value)
const balanceAfter = computed(() => balance.value !== undefined && total.value !== undefined && lines.value.length && !insufficient.value
  ? balance.value - total.value : undefined)
const canSave = computed(() => !accountError.value && props.workers.some(worker => worker.id === workerId.value)
  && lines.value.length > 0 && total.value !== undefined && balance.value !== undefined && !insufficient.value
  && !!finishedWarehouseId.value && (!needsWarehouse.value || warehouseId.value))

watch(() => ledger.value.accounts, (accounts) => {
  if (!accounts.some(account => account.id === accountId.value)) accountId.value = accounts.length === 1 ? accounts[0]!.id : ''
}, { immediate: true })
watch([lines, accountId, warehouseId, finishedWarehouseId, workerId, date], () => { if (inventory.value) error.value = '' })

onMounted(() => {
  loadAccounts()
  window.addEventListener('storage', syncAccounts)
  try {
    inventory.value = readInventory()
  } catch {
    error.value = 'Не удалось загрузить техкарты склада.'
  }
})
onBeforeUnmount(() => window.removeEventListener('storage', syncAccounts))

async function submit() {
  if (busy.value || !canSave.value) return
  busy.value = true
  error.value = ''
  try {
    await savePaidWork(workerId.value, { date: date.value, warehouseId: warehouseId.value, accountId: accountId.value,
      finishedWarehouseId: finishedWarehouseId.value, lines: lines.value })
    emit('close')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось сохранить работу.'
  } finally {
    loadAccounts()
    busy.value = false
  }
}
</script>

<template>
  <WorkshopDialog title="Добавить работу" wide class="work-entry-dialog" :busy="busy" @close="$emit('close')">
    <form class="dialog-content" @submit.prevent="submit">
      <div class="work-entry-grid">
        <fieldset class="work-entry-fieldset" :disabled="busy">
          <legend>Рабочие</legend>
          <div class="work-entry-workers">
            <label v-for="worker in workers" :key="worker.id" class="work-entry-worker">
              <span>{{ worker.name }}</span>
              <input v-model="workerId" type="radio" name="work-entry-worker" :value="worker.id" />
            </label>
            <p v-if="!workers.length" class="inventory-muted">Сначала добавьте рабочего.</p>
          </div>
        </fieldset>
        <WorkEntryCards v-model="lines" :cards="cards" :disabled="busy" :ready="!!inventory" @materials="materialCard = $event" />
      </div>
      <div class="form-grid work-entry-fields">
        <label class="inventory-field">Дата работы<input v-model="date" type="date" required :disabled="busy" /></label>
        <WorkWarehouseFields v-model:material-id="warehouseId" v-model:finished-id="finishedWarehouseId"
          :warehouses="inventory?.warehouses ?? []" :required-materials="needsWarehouse" :disabled="busy" />
        <label class="inventory-field">Счёт для оплаты
          <select v-model="accountId" required :disabled="busy || !!accountError">
            <option value="" disabled>{{ ledger.accounts.length ? 'Выберите счёт' : 'Нет счетов' }}</option>
            <option v-for="account in ledger.accounts" :key="account.id" :value="account.id">{{ account.name }}</option>
          </select>
        </label>
      </div>
      <WorkPaymentSummary :total="total" :balance="balance" :balance-after="balanceAfter" />
      <p v-if="accountError" class="inventory-message error" role="alert">{{ accountError }}</p>
      <p v-else-if="!ledger.accounts.length" class="inventory-muted">Сначала добавьте счёт в разделе «Счета».</p>
      <p v-else-if="insufficient && !error" class="inventory-message error" role="alert">На счёте недостаточно средств.</p>
      <p v-if="error" class="inventory-message error" role="alert">{{ error }}</p>
      <div class="dialog-actions">
        <button type="button" class="inventory-button secondary" :disabled="busy" @click="$emit('close')">Отмена</button>
        <button type="submit" class="inventory-button primary" :disabled="busy || !canSave">Оплатить и сохранить</button>
      </div>
    </form>
    <WorkMaterialDialog v-if="materialCard && inventory" :card="materialCard" :inventory="inventory"
      :warehouse-id="warehouseId" :count="previewQuantity" @close="materialCard = undefined" />
  </WorkshopDialog>
</template>

<style src="../assets/work-entry.css"></style>
