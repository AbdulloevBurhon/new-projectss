<script setup lang="ts">
import WorkshopHeader from '~/features/tsekh/components/WorkshopHeader.vue'
import WorkshopIcon from '~/features/tsekh/components/WorkshopIcon.vue'
import { money } from '~/features/tsekh/warehouse/utils/format'
import { useAccounts } from '../stores/useAccounts'
import type { Account, AccountMovement, AccountTab, MovementKind } from '../types/accounts'
import { movementLabels, newestFirst } from '../utils/ledger'
import AccountEditor from './AccountEditor.vue'
import AccountJournal from './AccountJournal.vue'
import AccountsTable from './AccountsTable.vue'
import LedgerDeleteDialog from './LedgerDeleteDialog.vue'
import MovementEditor from './MovementEditor.vue'
import MovementsTable from './MovementsTable.vue'

const route = useRoute()
const { ledger, balances, ready, error, load, sync } = useAccounts()
const tabs = [
  { id: 'accounts', label: 'Счета', action: 'Добавить счёт', to: '/tsekh/accounts' },
  { id: 'income', label: 'Приход', action: 'Добавить приход', to: '/tsekh/accounts?tab=income' },
  { id: 'expense', label: 'Списание', action: 'Добавить списание', to: '/tsekh/accounts?tab=expense' },
] as const
const active = computed(() => tabs.find(item => item.id === route.query.tab) ?? tabs[0])
const movements = computed(() => newestFirst(ledger.value.movements.filter(item => item.kind === active.value.id)))
const accountEditor = ref<{ account?: Account }>()
const movementEditor = ref<{ kind: MovementKind; movement?: AccountMovement }>()
const journalId = ref('')
const journal = computed(() => ledger.value.accounts.find(item => item.id === journalId.value))
const deleting = ref<{ kind: 'account' | 'movement'; id: string; label: string }>()

function add(tab: AccountTab) {
  if (tab === 'accounts') accountEditor.value = {}
  else movementEditor.value = { kind: tab }
}

function deleteMovement(movement: AccountMovement) {
  const label = movement.note || `${movementLabels[movement.kind]} ${money(movement.cents / 100)}`
  deleting.value = { kind: 'movement', id: movement.id, label }
}

onMounted(() => {
  load()
  window.addEventListener('storage', sync)
})
onBeforeUnmount(() => window.removeEventListener('storage', sync))
</script>

<template>
  <WorkshopHeader section="Управление цехом" title="Счета" description="Остатки по счетам, приходы и списания." icon="accounts">
    <div class="inventory-tab-toolbar">
      <nav class="inventory-tabs" aria-label="Вкладки счетов">
        <NuxtLink v-for="item in tabs" :key="item.id" :to="item.to" aria-current-value="false"
          :aria-current="item.id === active.id ? 'page' : undefined" :class="{ 'is-current': item.id === active.id }">
          {{ item.label }}
        </NuxtLink>
      </nav>
      <button v-if="ready && !error" type="button" class="inventory-tab-action inventory-button primary"
        :disabled="active.id !== 'accounts' && !ledger.accounts.length" @click="add(active.id)">
        <WorkshopIcon name="plus" /> {{ active.action }}
      </button>
    </div>
    <p v-if="error" class="inventory-message error" role="alert">{{ error }}</p>
    <p v-else-if="!ready" class="inventory-muted" role="status">Загрузка счетов…</p>
    <AccountsTable v-else-if="active.id === 'accounts'" :accounts="ledger.accounts" :balances="balances"
      @info="journalId = $event.id" @edit="accountEditor = { account: $event }"
      @delete="deleting = { kind: 'account', id: $event.id, label: $event.name }" />
    <template v-else>
      <p v-if="!ledger.accounts.length" class="inventory-muted accounts-empty">
        Сначала <NuxtLink to="/tsekh/accounts">добавьте счёт</NuxtLink>, чтобы провести операцию.
      </p>
      <MovementsTable :kind="active.id" :movements="movements" :accounts="ledger.accounts"
        @edit="movementEditor = { kind: $event.kind, movement: $event }" @delete="deleteMovement" />
    </template>

    <AccountEditor v-if="accountEditor" :account="accountEditor.account" @close="accountEditor = undefined" />
    <MovementEditor v-if="movementEditor" v-bind="movementEditor" @close="movementEditor = undefined" />
    <AccountJournal v-if="journal" :account="journal" @close="journalId = ''" />
    <LedgerDeleteDialog v-if="deleting" v-bind="deleting" @close="deleting = undefined" />
  </WorkshopHeader>
</template>
