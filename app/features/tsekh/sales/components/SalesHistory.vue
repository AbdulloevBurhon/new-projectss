<script setup lang="ts">
import WorkshopTable from '~/features/tsekh/components/WorkshopTable.vue'
import WorkshopIcon from '~/features/tsekh/components/WorkshopIcon.vue'
import { operationDateTime } from '~/features/tsekh/utils/operation-date'
import type { AccountMovement } from '~/features/tsekh/accounts/types/accounts'
import { money } from '~/features/tsekh/warehouse/utils/format'
import { finishedStockKey, unassignedWarehouseName } from '~/features/tsekh/warehouse/utils/finished-stock'
import SaleCancelDialog from './SaleCancelDialog.vue'

defineProps<{ history: AccountMovement[]; cancel: (id: string) => Promise<void> }>()
const selected = ref<string>()
</script>

<template>
  <section class="inventory-panel" aria-label="История продаж">
    <div class="panel-heading"><div><h2>История продаж</h2><p>Всего продаж: {{ history.length }}</p></div></div>
    <WorkshopTable :rows="history" v-slot="{ pageRows }">
      <thead><tr><th scope="col">Дата и время</th><th scope="col">Название</th><th scope="col" class="numeric-cell">Цена</th><th scope="col" class="table-actions">Действия</th></tr></thead>
      <tbody>
        <tr v-for="sale in pageRows" :key="sale.id">
          <td class="sales-date">{{ operationDateTime(sale.date, sale.createdAt) }}</td>
          <td>
            <div v-for="line in sale.sale" :key="finishedStockKey(line.techcardId, line.warehouseId)">
              <strong>{{ line.name }}</strong> × {{ line.quantity }}<small class="table-secondary">{{ line.warehouseName ?? unassignedWarehouseName }}</small>
            </div>
          </td>
          <td class="numeric-cell">
            <strong>{{ money((sale.clientSale?.totalCents ?? sale.cents) / 100) }}</strong>
            <small v-if="sale.clientSale && sale.clientSale.totalCents > sale.cents" class="table-secondary">Долг · {{ money((sale.clientSale.totalCents - sale.cents) / 100) }}</small>
          </td>
          <td class="table-actions"><button type="button" class="icon-button danger" :aria-label="`Удалить: ${sale.note}`" title="Удалить" @click="selected = sale.id"><WorkshopIcon name="trash" /></button></td>
        </tr>
        <tr v-if="!history.length"><td colspan="4" class="table-empty">Продаж пока нет.</td></tr>
      </tbody>
    </WorkshopTable>
  </section>
  <SaleCancelDialog v-if="selected" :sale-id="selected" :cancel="cancel" @close="selected = undefined" />
</template>
