<script setup lang="ts">
import { ref,onMounted } from 'vue'
import { Info } from '@lucide/vue'
import { Button,DataTable,Dialog,DialogContent,DialogHeader,DialogTitle } from '@obshaya/ui'
import { money,reports,positions,type Receipt,type Position } from '../../../endpoints/sales/service'
const rows=ref<Receipt[]>([]),selected=ref<Receipt>(),lines=ref<Position[]>([]),error=ref('')
const columns=[{key:'date',label:'Дата'},{key:'seller',label:'Продавец'},{key:'role',label:'Роль'},{key:'accountName',label:'Счёт'},{key:'total',label:'Продажа'},{key:'paid',label:'Оплачено'},{key:'debt',label:'Долг'},{key:'info',label:'Чек'}]
onMounted(async()=>{try{rows.value=await reports()}catch{error.value='Не удалось получить отчёт.'}})
async function show(r:Receipt){try{lines.value=await positions(r.id);selected.value=r}catch{error.value='Не удалось открыть чек.'}}
</script>
<template>
  <main class="space-y-5 p-6"><h1 class="text-3xl font-semibold">Отчёты</h1>
    <p v-if="error" role="alert">{{error}}</p>
    <DataTable :rows="rows" :columns="columns" empty-text="Продаж пока нет">
      <template #cell-date="{row}">{{new Date(row.date).toLocaleString('ru-RU')}}</template>
      <template #cell-total="{row}">{{money(row.total)}}</template><template #cell-paid="{row}">{{money(row.paid)}}</template>
      <template #cell-debt="{row}">{{money(row.total-row.paid)}}</template>
      <template #cell-info="{row}"><Button variant="ghost" size="icon" aria-label="Посмотреть чек" @click="show(row)"><Info class="size-4"/></Button></template>
    </DataTable>
    <Dialog :open="!!selected" @update:open="v=>{if(!v)selected=undefined}"><DialogContent v-if="selected" class="max-h-[85vh] overflow-auto">
      <DialogHeader><DialogTitle>Чек продажи</DialogTitle></DialogHeader>
      <p>{{new Date(selected.date).toLocaleString('ru-RU')}} · {{selected.warehouseName}} · {{selected.accountName}}</p>
      <p>{{selected.seller}} · {{selected.role}} <span v-if="selected.clientName">· {{selected.clientName}}</span></p>
      <div v-for="(l,i) in lines" :key="i" class="border-b py-2"><strong>{{l.name}}</strong>
        <div>{{l.qty}} {{l.unit}} × {{l.price}} сом = {{money(l.amount)}}</div>
        <small v-if="l.price<l.listPrice">Цена по каталогу {{l.listPrice}} сом · Скидка {{money(Math.round(l.qty*l.listPrice*100)-l.amount)}}</small>
      </div>
      <p>Скидка на чек {{money(selected.discount)}} · Итого {{money(selected.total)}}</p>
      <p>Оплачено {{money(selected.paid)}} · Долг {{money(selected.total-selected.paid)}}</p>
    </DialogContent></Dialog>
  </main>
</template>
