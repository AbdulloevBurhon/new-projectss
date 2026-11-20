<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Button,DataTable,Input,TabsContent } from '@obshaya/ui'
import { ArrowLeftRight,SlidersHorizontal } from '@lucide/vue'
import StockMovementDialog from './StockMovementDialog.vue'
import { type Goods } from '../../../../../endpoints/sales/service'
import { numberFormat } from '../../format'
import { useWarehouseContext } from '../../composables/warehouseContext'
const { activeTab,posted,listedWarehouses,warehouseNames,receiptLoadError } = useWarehouseContext()
const balanceWarehouseId = ref('')
const balanceSearch = ref('')
const movement=ref<'transfer'|'adjust'>()
const revision=ref(0)
const stockCatalog=ref<Goods[]>([])
const stockError=ref('')
watch([activeTab,posted,revision],async ([tab],_,onCleanup)=>{
  if(tab!=='balance')return
  let active=true
  onCleanup(()=>{active=false})
  try {const rows=await $fetch<Goods[]>('/api/sales/stock');if(active){stockCatalog.value=rows;stockError.value=''}}
  catch {if(active)stockError.value='Не удалось загрузить данные склада.'}
},{immediate:true})
const balanceRows=computed(()=>stockCatalog.value.filter(p=>(!balanceWarehouseId.value || p.warehouse===balanceWarehouseId.value)
  && p.name.toLowerCase().includes(balanceSearch.value.trim().toLowerCase())).map(p=>{
    const packaged=!!p.contentUnit && ['шт','уп'].includes(p.unit)
    const stock=packaged?Math.floor(p.stock):p.stock
    return {...p,product:p.name,warehouse:warehouseNames.value.get(p.warehouse),stock,contentStock:p.stock*p.factor,
      opened:Number(packaged && p.stock>stock),remaining:(p.stock-stock)*p.factor}
  }))
const balanceColumns = [
  { key: 'product', label: 'Товар' },
  { key: 'warehouse', label: 'Склад' },
  { key: 'stock', label: 'Остаток', align: 'right' as const },
  { key: 'contentStock', label: 'Остаток содержимого', align: 'right' as const },
  { key: 'opened', label: 'Открыто', align: 'right' as const },
  { key: 'openedRemaining', label: 'Остаток из открытого', align: 'right' as const },
]
</script>

<template>
  <TabsContent value="balance" class="space-y-4">
    <div class="flex flex-wrap items-center gap-3">
      <select v-model="balanceWarehouseId" aria-label="Склад" class="h-10 min-w-48 rounded-md border bg-background px-3 text-sm"><option value="">Все склады</option><option v-for="warehouse in listedWarehouses" :key="warehouse.id" :value="warehouse.id">{{ warehouse.name }}</option></select>
      <Input v-model="balanceSearch" class="max-w-xs" type="search" placeholder="Поиск по названию" aria-label="Поиск товара" />
      <div class="ml-auto flex flex-wrap gap-2">
        <Button type="button" variant="outline" @click="movement='transfer'"><ArrowLeftRight class="size-4" />Перемещение</Button>
        <Button type="button" variant="outline" @click="movement='adjust'"><SlidersHorizontal class="size-4" />Корректировка</Button>
      </div>
    </div>
    <p v-if="receiptLoadError" class="text-sm text-destructive" role="alert">{{ receiptLoadError }}</p>
    <p v-if="stockError" role="alert">{{stockError}}</p>
    <DataTable :columns="balanceColumns" :rows="balanceRows" empty-text="Остатков пока нет">
      <template #cell-stock="{ row }">{{ numberFormat.format(row.stock) }} {{ row.unit }}</template>
      <template #cell-contentStock="{ row }">{{ row.contentUnit ? `${numberFormat.format(row.contentStock)} ${row.contentUnit}` : '—' }}</template>
      <template #cell-opened="{ row }">{{ row.contentUnit || row.unit === 'уп' ? `${row.opened} ${row.unit}` : '—' }}</template>
      <template #cell-openedRemaining="{ row }">{{ row.contentUnit ? `${numberFormat.format(row.remaining)} ${row.contentUnit}` : '—' }}</template>
    </DataTable>
  </TabsContent>
    <StockMovementDialog v-if="movement" :mode="movement" :goods="stockCatalog" :warehouses="listedWarehouses" @close="movement=undefined" @done="movement=undefined;revision++" />
</template>
