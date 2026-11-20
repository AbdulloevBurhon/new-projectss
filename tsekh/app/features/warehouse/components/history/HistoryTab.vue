<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Button,DataTable,Input,TabsContent } from '@obshaya/ui'
import { money,numberFormat,operationDate } from '../../format'
import { useWarehouseContext } from '../../composables/warehouseContext'
const { activeTab,posted,listedWarehouses,receiptLoadError } = useWarehouseContext()
const historyWarehouseId = ref('')
const historyFrom = ref('')
const historyTo = ref('')
type HistoryEntry = {id:string;operation:string;postedAt:number|null;warehouseId:string;warehouseName:string;productName:string;quantity:number|null;unit:string;total:number|null}
const movements=ref<HistoryEntry[]>([])
const historyRows = computed(() => [...posted.value.map(r=>({...r,operation:'Приход'})),...movements.value].sort((a,b)=>(b.postedAt??0)-(a.postedAt??0)).filter(row => {
  const date = new Date(row.postedAt!)
  const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return (!historyWarehouseId.value || row.warehouseId === historyWarehouseId.value)
    && (!historyFrom.value || day >= historyFrom.value)
    && (!historyTo.value || day <= historyTo.value)
}))
const historyTotal = computed(() => historyRows.value.filter(r=>r.operation==="Приход").reduce((total, row) => total + (row.total ?? 0), 0))
const stockError=ref('')
watch([activeTab,posted],async ([tab],_,onCleanup)=>{
  if(tab!=='history')return
  let active=true
  onCleanup(()=>{active=false})
  try {const rows=await $fetch<HistoryEntry[]>('/api/sales/history');if(active){movements.value=rows;stockError.value=''}}
  catch {if(active)stockError.value='Не удалось загрузить данные склада.'}
},{immediate:true})
const historyColumns = [
  { key: 'operation', label: 'Операция, дата и время' },
  { key: 'product', label: 'Товар' },
  { key: 'warehouse', label: 'Склад' },
  { key: 'worker', label: 'Рабочий' },
  { key: 'quantity', label: 'Количество', align: 'right' as const },
  { key: 'opened', label: 'Открыто', align: 'right' as const },
  { key: 'sum', label: 'Сумма', align: 'right' as const },
]
</script>

<template>
  <TabsContent value="history" class="space-y-4">
    <div class="grid gap-3 sm:grid-cols-3">
      <div class="rounded-xl border bg-background p-4"><p class="text-sm text-muted-foreground">Поступления</p><p class="mt-1 text-xl font-semibold">{{ historyRows.filter(r=>r.operation==='Приход').length }}</p></div>
      <div class="rounded-xl border bg-background p-4"><p class="text-sm text-muted-foreground">Расходы</p><p class="mt-1 text-xl font-semibold">{{ historyRows.filter(r=>(r.quantity??0)<0).length }}</p></div>
      <div class="rounded-xl border bg-background p-4"><p class="text-sm text-muted-foreground">Сумма поступлений</p><p class="mt-1 text-xl font-semibold">{{ money(historyTotal) }} сом</p></div>
    </div>
    <div class="flex flex-wrap items-end gap-3">
      <label class="grid gap-1 text-sm">Склад<select v-model="historyWarehouseId" class="h-10 min-w-44 rounded-md border bg-background px-3"><option value="">Все склады</option><option v-for="warehouse in listedWarehouses" :key="warehouse.id" :value="warehouse.id">{{ warehouse.name }}</option></select></label>
      <label class="grid gap-1 text-sm">С даты<Input v-model="historyFrom" type="date" /></label>
      <label class="grid gap-1 text-sm">По дату<Input v-model="historyTo" type="date" /></label>
      <Button variant="outline" @click="historyWarehouseId = ''; historyFrom = ''; historyTo = ''">Сбросить</Button>
    </div>
    <p v-if="receiptLoadError" class="text-sm text-destructive" role="alert">{{ receiptLoadError }}</p>
    <DataTable :columns="historyColumns" :rows="historyRows" empty-text="Операций пока нет">
      <template #cell-operation="{ row }">{{ row.operation }} <small class="block text-muted-foreground">{{ operationDate.format(row.postedAt) }}</small></template>
      <template #cell-product="{ row }">{{ row.productName }}</template>
      <template #cell-warehouse="{ row }">{{ row.warehouseName }}</template>
      <template #cell-quantity="{ row }">{{ numberFormat.format(row.quantity) }} {{ row.unit }}</template>
      <template #cell-opened="{ row }">{{ row.unit === 'уп' || row.contentUnit ? '0' : '—' }}</template>
      <template #cell-sum="{ row }">{{ row.total == null ? '—' : money(row.total)+' сом' }}</template>
    </DataTable>
  </TabsContent>
</template>
