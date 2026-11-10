<script setup lang="ts">
import WorkshopTable from '~/features/tsekh/components/WorkshopTable.vue'
import WorkshopDialog from '~/features/tsekh/components/WorkshopDialog.vue'
import WorkshopIcon from '~/features/tsekh/components/WorkshopIcon.vue'
import { money } from '~/features/tsekh/warehouse/utils/format'
import { operationDateTime } from '~/features/tsekh/utils/operation-date'
import { useAccounts } from '../stores/useAccounts'
import type { Account, AccountMovement } from '../types/accounts'
import { movementLabels, newestFirst } from '../utils/ledger'
import LedgerDeleteDialog from './LedgerDeleteDialog.vue'

const props = defineProps<{ account: Account }>()
defineEmits<{ close: [] }>()
const { ledger, balances } = useAccounts()
const from = ref('')
const to = ref('')
const deleting = ref<AccountMovement>()
const movements = computed(() => newestFirst(ledger.value.movements.filter(item =>
  item.accountId === props.account.id && (!from.value || item.date >= from.value) && (!to.value || item.date <= to.value),
)))

function reset() {
  from.value = ''
  to.value = ''
}
</script>

<template>
  <WorkshopDialog :title="account.name" wide @close="$emit('close')">
    <div class="dialog-content">
      <div class="account-journal-summary">
        <div><span>Остаток счёта</span><strong>{{ money((balances.get(account.id) ?? 0) / 100) }}</strong></div>
        <div><span>Операций за период</span><strong>{{ movements.length }}</strong></div>
      </div>
      <div class="account-period" role="group" aria-label="Фильтр по дате">
        <label class="inventory-field">С даты<input v-model="from" type="date" :max="to || undefined" /></label>
        <label class="inventory-field">По дату<input v-model="to" type="date" :min="from || undefined" /></label>
        <button v-if="from || to" type="button" class="inventory-button secondary" @click="reset">Сбросить</button>
      </div>
      <div class="account-journal-table">
        <WorkshopTable :rows="movements" :reset-key="JSON.stringify([account.id, from, to])" v-slot="{ pageRows }">
          <thead>
            <tr><th scope="col">Дата и время</th><th scope="col" class="numeric-cell">Сумма</th><th scope="col">Цель</th><th scope="col" class="table-actions">Действия</th></tr>
          </thead>
          <tbody>
            <tr v-for="item in pageRows" :key="item.id">
              <td class="account-date">{{ operationDateTime(item.date, item.createdAt) }}</td>
              <td class="numeric-cell">
                <span class="inventory-tag" :class="item.kind === 'income' ? 'positive' : 'account-negative'">
                  {{ item.kind === 'income' ? '+' : '−' }}{{ money(item.cents / 100) }}
                </span>
              </td>
              <td class="account-text">{{ item.note || movementLabels[item.kind] }}</td>
              <td class="table-actions">
                <NuxtLink v-if="item.sale" to="/tsekh/sales?tab=history">Продажи</NuxtLink>
                <NuxtLink v-else-if="item.receiptId" to="/tsekh/warehouse/history">Склад</NuxtLink>
                <NuxtLink v-else-if="item.workPaymentId" to="/tsekh/workers">Рабочие</NuxtLink>
                <button v-else type="button" class="icon-button danger" :aria-label="`Удалить: ${item.note || movementLabels[item.kind]}`" title="Удалить" @click="deleting = item">
                  <WorkshopIcon name="trash" />
                </button>
              </td>
            </tr>
            <tr v-if="!movements.length"><td colspan="4" class="table-empty">{{ from || to ? 'За выбранный период операций нет.' : 'По счёту пока нет операций.' }}</td></tr>
          </tbody>
        </WorkshopTable>
      </div>
    </div>
    <LedgerDeleteDialog v-if="deleting" kind="movement" :id="deleting.id" :label="deleting.note || movementLabels[deleting.kind]" @close="deleting = undefined" />
  </WorkshopDialog>
</template>
