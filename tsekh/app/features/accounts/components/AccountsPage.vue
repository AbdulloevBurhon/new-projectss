<script setup lang="ts">
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, Wallet } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { Tabs, TabsList, TabsTrigger, toast } from '@obshaya/ui'
import { loadAccounts } from '../../../../endpoints/accounts/get-accounts/store'
import AccountsListTab from './AccountsListTab.vue'
import AccountCashMovementsTab from './AccountCashMovementsTab.vue'
import AccountTransfersTab from './AccountTransfersTab.vue'

const activeTab = ref('accounts')
const tabs = [
  { value: 'accounts', label: 'Счёт', icon: Wallet },
  { value: 'receipts', label: 'Поступление', icon: ArrowDownToLine },
  { value: 'expenses', label: 'Списание', icon: ArrowUpFromLine },
  { value: 'transfers', label: 'Перевод', icon: ArrowLeftRight },
]
const activeTitle = computed(() => tabs.find(tab => tab.value === activeTab.value)?.label ?? 'Счёт')

onMounted(async () => {
  try { await loadAccounts() }
  catch { toast.error('Не удалось загрузить данные счёта из базы данных.') }
})
</script>

<template>
  <section class="w-full p-5 text-slate-900 sm:p-8">
    <h1 class="mt-2 text-3xl font-semibold tracking-tight">{{ activeTitle }}</h1>
    <Tabs v-model:model-value="activeTab" class="mt-6 gap-5">
      <TabsList class="h-auto w-fit flex-wrap rounded-xl bg-muted p-1.5">
        <TabsTrigger v-for="tab in tabs" :key="tab.value" :value="tab.value" class="h-9 flex-none gap-2 rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
          <component :is="tab.icon" class="size-4 text-blue-600" />
          {{ tab.label }}
        </TabsTrigger>
      </TabsList>

      <AccountsListTab />
      <AccountCashMovementsTab kind="income" />
      <AccountCashMovementsTab kind="expense" />
      <AccountTransfersTab />
    </Tabs>
  </section>
</template>
