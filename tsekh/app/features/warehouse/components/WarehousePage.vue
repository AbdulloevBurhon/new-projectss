<script setup lang="ts">
import { Archive,Boxes,CalendarDays,Inbox,NotebookPen,RefreshCw,Warehouse as WarehouseIcon } from '@lucide/vue'
import { computed } from 'vue'
import { Tabs,TabsList,TabsTrigger } from '@obshaya/ui'
import { provideWarehouseContext } from '../composables/warehouseContext'
import WarehouseListTab from './warehouses/WarehouseListTab.vue'
import BalanceTab from './balance/BalanceTab.vue'
import HistoryTab from './history/HistoryTab.vue'
import ProductsTab from './products/ProductsTab.vue'
import TechCardsTab from './techcards/TechCardsTab.vue'
import ReceiptsTab from './receipts/ReceiptsTab.vue'
import ExpiryTab from './expiry/ExpiryTab.vue'
const { activeTab }=provideWarehouseContext()
const tabs = [
  { value: 'warehouses', label: 'Склады' },
  { value: 'balance', label: 'Остатки' },
  { value: 'history', label: 'История' },
  { value: 'products', label: 'Товары' },
  { value: 'techcards', label: 'Техкарты' },
  { value: 'receipts', label: 'Поступление' },
  { value: 'expiry', label: 'Срок годности' },
]
const activeTitle = computed(() => tabs.find(tab => tab.value === activeTab.value)?.label ?? 'Склады')
</script>

<template>
  <section class="w-full p-5 text-slate-900 sm:p-8" aria-labelledby="warehouses-title">
    <h1 id="warehouses-title" class="mt-2 text-3xl font-semibold tracking-tight">{{ activeTitle }}</h1>
    <Tabs v-model:model-value="activeTab" class="mt-6 gap-5">
      <div class="flex flex-wrap items-center gap-2">
        <TabsList class="h-auto w-fit flex-wrap rounded-xl bg-muted p-1.5">
          <TabsTrigger value="warehouses" class="h-9 flex-none rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <WarehouseIcon class="size-4 text-blue-600" />
            Склады
          </TabsTrigger>
          <TabsTrigger value="balance" class="h-9 flex-none rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Boxes class="size-4 text-blue-600" />
            Остатки
          </TabsTrigger>
          <TabsTrigger value="history" class="h-9 flex-none rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"><RefreshCw class="size-4 text-blue-600" />История</TabsTrigger>
          <TabsTrigger value="products" class="h-9 flex-none rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"><Archive class="size-4 text-blue-600" />Товары</TabsTrigger>
          <TabsTrigger value="techcards" class="h-9 flex-none rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"><NotebookPen class="size-4 text-blue-600" />Техкарты</TabsTrigger>
          <TabsTrigger value="receipts" class="h-9 flex-none rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"><Inbox class="size-4 text-blue-600" />Поступление</TabsTrigger>
          <TabsTrigger value="expiry" class="h-9 flex-none rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"><CalendarDays class="size-4 text-blue-600" />Срок годности</TabsTrigger>
        </TabsList>
      </div>

      <WarehouseListTab />
      <BalanceTab />
      <HistoryTab />
      <ProductsTab />
      <TechCardsTab />
      <ReceiptsTab />
      <ExpiryTab />
    </Tabs>
  </section>
</template>
