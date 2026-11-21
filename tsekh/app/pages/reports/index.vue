<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ChartColumn, Info } from '@lucide/vue'
import { Button, DataTable, Input, Tabs, TabsContent, TabsList, TabsTrigger } from '@obshaya/ui'
import { money,reports,positions,type Receipt,type Position } from '../../../endpoints/sales/service'
import SaleReceiptDialog from '../../features/reports/components/SaleReceiptDialog.vue'
const rows=ref<Receipt[]>([]),error=ref('')
const opened = ref<{ receipt: Receipt; lines: Position[] }>()
let request = 0
const search = ref('')
const query = computed(() => search.value.trim().toLocaleLowerCase('ru'))
const visibleRows = computed(() => {
  if (!query.value) return rows.value
  return rows.value.filter(row =>
    [row.seller, row.role, row.accountName, new Date(row.date).toLocaleString('ru-RU')]
      .some(value => value.toLocaleLowerCase('ru').includes(query.value)),
  )
})
const columns=[{key:'date',label:'Дата'},{key:'seller',label:'Сотрудник'},{key:'role',label:'Роль'},{key:'accountName',label:'Счёт'},{key:'total',label:'Продажа'},{key:'paid',label:'Оплачено'},{key:'debt',label:'Долг'},{key:'info',label:'Чек'}]
onMounted(async()=>{try{rows.value=await reports()}catch{error.value='Не удалось получить отчёт.'}})
async function show(receipt: Receipt) {
  const current = ++request
  try {
    const lines = await positions(receipt.id)
    if (current === request) {
      error.value = ''
      opened.value = { receipt, lines }
    }
  } catch {
    if (current === request) error.value = 'Не удалось открыть чек.'
  }
}
</script>
<template>
  <main class="space-y-5 p-6"><h1 class="text-3xl font-semibold">Отчёты</h1>
    <Tabs default-value="reports" class="gap-5">
      <TabsList class="h-auto w-fit rounded-xl bg-muted p-1.5">
        <TabsTrigger value="reports" class="h-9 gap-2 rounded-lg px-4">
          <ChartColumn class="size-4 text-blue-600" />Отчёты
        </TabsTrigger>
      </TabsList>
      <TabsContent value="reports" class="space-y-4">
        <p v-if="error" class="text-destructive" role="alert">{{ error }}</p>
        <Input v-model="search" class="max-w-xs" type="search" placeholder="Поиск по отчётам" aria-label="Поиск по отчётам" />
        <DataTable :rows="visibleRows" :columns="columns" :reset-key="query" :empty-text="query ? 'Совпадений не найдено' : 'Продаж пока нет'">
          <template #cell-date="{row}">{{new Date(row.date).toLocaleString('ru-RU')}}</template>
          <template #cell-total="{row}">{{money(row.total)}}</template><template #cell-paid="{row}">{{money(row.paid)}}</template>
          <template #cell-debt="{row}">{{money(row.total-row.paid)}}</template>
          <template #cell-info="{row}"><Button variant="ghost" size="icon" aria-label="Посмотреть чек" @click="show(row)"><Info class="size-4"/></Button></template>
        </DataTable>
      </TabsContent>
    </Tabs>
    <SaleReceiptDialog v-if="opened" v-bind="opened" @close="opened = undefined" />
  </main>
</template>
