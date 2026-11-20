<script setup lang="ts">
import { computed } from 'vue'
import { Trash2 } from '@lucide/vue'
import { Button, Input } from '@obshaya/ui'
import { basis,cents,modes,money,sum,type Line } from '../../../../endpoints/sales/service'
const props=defineProps<{items:Line[];canPay:boolean}>()
defineEmits<{remove:[key:string];clear:[];pay:[]}>()
function unit(row:Line){row.qty=1;row.actual=Number((row.price*basis(row).ratio).toFixed(6))}
const valid=computed(()=>props.items.length && props.items.every(r=>{
  const used=props.items.filter(x=>x.id===r.id).reduce((n,x)=>n+x.qty*basis(x).ratio,0)
  return r.qty>0 && Number.isFinite(Number(r.actual)) && r.actual>=0 && used<=r.stock+1e-9 &&
    (!['шт','уп'].includes(basis(r).unit) || Number.isInteger(Number(r.qty)))
}))
</script>
<template>
  <section class="flex min-h-[430px] flex-col rounded-xl border bg-background xl:min-h-0">
    <header class="flex items-center justify-between border-b p-4"><h2 class="font-semibold">Корзина</h2><Button v-if="items.length" size="sm" variant="ghost" @click="$emit('clear')">Очистить</Button></header>
    <div class="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
      <article v-for="r in items" :key="r.key" class="space-y-2 rounded-lg border p-3">
        <div class="flex items-center justify-between"><strong>{{r.name}}</strong><Button variant="ghost" size="icon" aria-label="Убрать из корзины" @click="$emit('remove',r.key)"><Trash2 class="size-4"/></Button></div>
        <div class="grid grid-cols-3 gap-2 text-xs">
          <label>Единица<select v-model="r.mode" class="block h-9 w-full rounded-md border bg-background" @change="unit(r)"><option v-for="m in modes(r)" :key="m.key" :value="m.key">{{m.unit}}{{m.key==='content'?' (внутри)':''}}</option></select></label>
          <label>Количество<Input v-model.number="r.qty" type="number" min="0" step="any"/></label>
          <label>Цена, сом<Input v-model.number="r.actual" type="number" min="0" step="any"/></label>
        </div>
        <p class="text-right text-sm">{{money(cents(r.qty*r.actual))}}</p>
      </article>
      <p v-if="!items.length" class="p-4 text-center text-muted-foreground">Выберите товары справа</p>
    </div>
    <footer class="flex items-center justify-between border-t px-4 py-2"><strong>Итого {{money(sum(items))}}</strong><Button :disabled="!valid || !canPay" @click="$emit('pay')">Оплата</Button></footer>
  </section>
</template>
