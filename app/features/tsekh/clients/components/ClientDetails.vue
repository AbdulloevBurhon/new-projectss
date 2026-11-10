<script setup lang="ts">
import WorkshopDialog from '~/features/tsekh/components/WorkshopDialog.vue'
import WorkshopIcon from '~/features/tsekh/components/WorkshopIcon.vue'
import WorkshopTable from '~/features/tsekh/components/WorkshopTable.vue'
import SaleCancelDialog from '~/features/tsekh/sales/components/SaleCancelDialog.vue'
import { finishedStockKey } from '~/features/tsekh/warehouse/utils/finished-stock'
import { money, quantity } from '~/features/tsekh/warehouse/utils/format'
import { operationDateTime } from '~/features/tsekh/utils/operation-date'
import type { Client } from '../types/clients'
import { purchaseTotals, type ClientPurchase } from '../utils/purchases'

const props = defineProps<{ client: Client; purchases: ClientPurchase[]; available: boolean; cancel: (id: string) => Promise<void> }>()
defineEmits<{ close: [] }>()
const totals = computed(() => purchaseTotals(props.purchases))
const deleting = ref<string>()
</script>

<template>
  <WorkshopDialog :title="client.name" wide class="client-details" @close="$emit('close')">
    <div class="dialog-content">
      <dl class="client-summary">
        <div><dt>Телефон</dt><dd>{{ client.phone }}</dd></div>
        <div><dt>Куплено дверей</dt><dd>{{ available ? quantity(totals.doors) : '—' }}</dd></div>
        <div><dt>Сумма покупок</dt><dd>{{ available ? money(totals.total / 100) : '—' }}</dd></div>
        <div><dt>Долг</dt><dd>{{ available ? money(totals.debt / 100) : '—' }}</dd></div>
      </dl>
      <p v-if="!available" class="inventory-muted">История покупок недоступна.</p>
      <div v-else class="client-purchases">
        <WorkshopTable :rows="purchases" :reset-key="client.id" v-slot="{ pageRows }">
          <thead>
            <tr>
              <th scope="col">Дата и время</th><th scope="col">Дверь</th><th scope="col" class="numeric-cell">Кол-во</th>
              <th scope="col" class="numeric-cell">Сумма</th><th scope="col" class="numeric-cell">Долг</th><th scope="col" class="table-actions">Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in pageRows" :key="row.id">
              <td>{{ operationDateTime(row.date, row.createdAt) }}</td>
              <td>
                <div v-for="line in row.lines" :key="finishedStockKey(line.techcardId, line.warehouseId)">
                  <strong>{{ line.name }}</strong> × {{ quantity(line.quantity) }}
                </div>
              </td>
              <td class="numeric-cell">{{ quantity(row.doors) }}</td>
              <td class="numeric-cell">{{ money(row.total / 100) }}</td>
              <td class="numeric-cell" :class="{ 'client-debt': row.debt > 0 }">{{ money(row.debt / 100) }}</td>
              <td class="table-actions">
                <button type="button" class="icon-button danger" aria-label="Отменить покупку" title="Отменить покупку" @click="deleting = row.id">
                  <WorkshopIcon name="trash" />
                </button>
              </td>
            </tr>
            <tr v-if="!purchases.length"><td colspan="6" class="table-empty">Покупок пока нет.</td></tr>
          </tbody>
        </WorkshopTable>
      </div>
    </div>
    <SaleCancelDialog v-if="deleting" :sale-id="deleting" :cancel="cancel" @close="deleting = undefined" />
  </WorkshopDialog>
</template>
