<script setup lang="ts">
import WorkshopTable from '~/features/tsekh/components/WorkshopTable.vue'
import WorkshopIcon from '~/features/tsekh/components/WorkshopIcon.vue'
import { money } from '~/features/tsekh/warehouse/utils/format'
import type { Account } from '../types/accounts'
import LedgerActions from './LedgerActions.vue'

defineProps<{ accounts: Account[]; balances: Map<string, number> }>()
defineEmits<{ info: [account: Account]; edit: [account: Account]; delete: [account: Account] }>()
</script>

<template>
  <section class="inventory-panel accounts-panel" aria-label="Список счетов">
    <WorkshopTable :rows="accounts" v-slot="{ pageRows }">
      <thead>
        <tr><th scope="col">Название</th><th scope="col" class="numeric-cell">Сумма</th><th scope="col" class="table-actions">Действия</th></tr>
      </thead>
      <tbody>
        <tr v-for="account in pageRows" :key="account.id">
          <td>
            <button type="button" class="table-item account-name" @click="$emit('info', account)">
              <span class="table-icon"><WorkshopIcon name="accounts" /></span><strong>{{ account.name }}</strong>
            </button>
          </td>
          <td class="numeric-cell">
            <span class="account-balance" :class="{ 'account-negative': (balances.get(account.id) ?? 0) < 0 }">
              {{ money((balances.get(account.id) ?? 0) / 100) }}
            </span>
          </td>
          <td class="table-actions">
            <LedgerActions :label="account.name" info @info="$emit('info', account)" @edit="$emit('edit', account)" @delete="$emit('delete', account)" />
          </td>
        </tr>
        <tr v-if="!accounts.length"><td colspan="3" class="table-empty">Добавьте первый счёт.</td></tr>
      </tbody>
    </WorkshopTable>
  </section>
</template>
