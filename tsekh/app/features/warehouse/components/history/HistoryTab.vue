<script setup lang="ts">
import { Button, Input, TabsContent } from '@obshaya/ui'
import { computed, ref, watch } from 'vue'
import { money } from '../../format'
import { useWarehouseContext } from '../../composables/warehouseContext'
import { historyOperations, useHistoryFilters } from '../../composables/useHistoryFilters'
import type { HistoryEntry, HistoryRow } from '../../types/history'
import HistoryProductSelect from './HistoryProductSelect.vue'
import HistoryTable from './HistoryTable.vue'

const { activeTab, posted, listedWarehouses, receiptLoadError, products } = useWarehouseContext()
const movements=ref<HistoryEntry[]>([])
const allRows = computed<HistoryRow[]>(() => [
  ...posted.value.map(receipt => ({ ...receipt, receipt, operation: 'Приход', rowKey: `receipt:${receipt.id}` })),
  ...movements.value.map(row => ({ ...row, receipt: null, rowKey: `movement:${row.id}` })),
].sort((a,b)=>(b.postedAt??0)-(a.postedAt??0)))
const { filters, filterKey, filteredRows: historyRows, productOptions, reset } = useHistoryFilters(allRows, () => products.state.rows)
const historyTotal = computed(() => historyRows.value.filter(r=>r.operation==="Приход").reduce((total, row) => total + (row.total ?? 0), 0))
const stockError=ref('')
watch([activeTab,posted],async ([tab],_,onCleanup)=>{
  if(tab!=='history')return
  let active=true
  onCleanup(()=>{active=false})
  try {const rows=await $fetch<HistoryEntry[]>('/api/sales/history');if(active){movements.value=rows;stockError.value=''}}
  catch {if(active)stockError.value='Не удалось загрузить данные склада.'}
},{immediate:true})
</script>

<template>
  <TabsContent value="history" class="space-y-4">
    <div class="grid gap-3 sm:grid-cols-3">
      <div class="rounded-xl border bg-background p-4"><p class="text-sm text-muted-foreground">Поступления</p><p class="mt-1 text-xl font-semibold">{{ historyRows.filter(r=>r.operation==='Приход').length }}</p></div>
      <div class="rounded-xl border bg-background p-4"><p class="text-sm text-muted-foreground">Расходы</p><p class="mt-1 text-xl font-semibold">{{ historyRows.filter(r=>(r.quantity??0)<0).length }}</p></div>
      <div class="rounded-xl border bg-background p-4"><p class="text-sm text-muted-foreground">Сумма поступлений</p><p class="mt-1 text-xl font-semibold">{{ money(historyTotal) }} сом</p></div>
    </div>
    <div class="flex flex-wrap items-end gap-3">
      <label class="grid gap-1 text-sm">Склад<select v-model="filters.warehouse" aria-label="Склад" class="h-10 min-w-44 rounded-md border bg-background px-3"><option value="">Все склады</option><option v-for="warehouse in listedWarehouses" :key="warehouse.id" :value="warehouse.id">{{ warehouse.name }}</option></select></label>
      <label class="grid gap-1 text-sm">
        Операция
        <select v-model="filters.operation" aria-label="Операция" class="h-10 min-w-44 rounded-md border bg-background px-3">
          <option value="">Все операции</option>
          <option v-for="operation in historyOperations" :key="operation" :value="operation">{{ operation }}</option>
        </select>
      </label>
      <HistoryProductSelect v-model="filters.product" :options="productOptions" />
      <label class="grid gap-1 text-sm">С даты<Input v-model="filters.from" type="date" class="h-10" /></label>
      <label class="grid gap-1 text-sm">По дату<Input v-model="filters.to" type="date" class="h-10" /></label>
      <Button variant="outline" class="h-10" @click="reset">Сбросить</Button>
    </div>
    <p v-if="receiptLoadError" class="text-sm text-destructive" role="alert">{{ receiptLoadError }}</p>
    <HistoryTable :rows="historyRows" :filter-key="filterKey" />
    <p v-if="stockError" class="text-sm text-destructive" role="alert">{{ stockError }}</p>
  </TabsContent>
</template>
