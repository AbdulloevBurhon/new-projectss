<script setup lang="ts">
import WorkshopTable from '~/features/tsekh/components/WorkshopTable.vue'
import { money } from '~/features/tsekh/warehouse/utils/format'
import { operationDateTime } from '~/features/tsekh/utils/operation-date'
import type { Account, AccountMovement, MovementKind } from '../types/accounts'
import { movementLabels } from '../utils/ledger'
import LedgerActions from './LedgerActions.vue'

const props = defineProps<{ movements: AccountMovement[]; accounts: Account[]; kind: MovementKind }>()
defineEmits<{ edit: [movement: AccountMovement]; delete: [movement: AccountMovement] }>()
const names = computed(() => new Map(props.accounts.map(account => [account.id, account.name])))
</script>

<template>
  <section class="inventory-panel accounts-panel" :aria-label="movementLabels[kind]">
    <WorkshopTable :rows="movements" :reset-key="kind" v-slot="{ pageRows }">
      <thead>
        <tr>
          <th scope="col">Дата и время</th><th scope="col" class="numeric-cell">Сумма</th><th scope="col">Счёт</th>
          <th scope="col">Заметка</th><th scope="col" class="table-actions">Действия</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="movement in pageRows" :key="movement.id">
          <td class="account-date">{{ operationDateTime(movement.date, movement.createdAt) }}</td>
          <td class="numeric-cell"><strong>{{ money(movement.cents / 100) }}</strong></td>
          <td>{{ names.get(movement.accountId) }}</td>
          <td class="account-text">{{ movement.note || '—' }}</td>
          <td class="table-actions">
            <NuxtLink v-if="movement.sale" to="/tsekh/sales?tab=history">История продаж</NuxtLink>
            <NuxtLink v-else-if="movement.receiptId" to="/tsekh/warehouse/history">История склада</NuxtLink>
            <NuxtLink v-else-if="movement.workPaymentId" to="/tsekh/workers">Рабочие</NuxtLink>
            <LedgerActions v-else :label="movement.note || money(movement.cents / 100)" @edit="$emit('edit', movement)" @delete="$emit('delete', movement)" />
          </td>
        </tr>
        <tr v-if="!movements.length"><td colspan="5" class="table-empty">Операций пока нет.</td></tr>
      </tbody>
    </WorkshopTable>
  </section>
</template>
