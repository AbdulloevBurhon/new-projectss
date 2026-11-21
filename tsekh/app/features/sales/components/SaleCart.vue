<script setup lang="ts">
import { useEmployeeAccess } from '../../workers/composables/useEmployeeAccess'
import { computed } from 'vue'
import { Trash2 } from '@lucide/vue'
import { Button, Input } from '@obshaya/ui'
import { basis,cents,modes,money,sum,type Line } from '../../../../endpoints/sales/service'
const { can } = useEmployeeAccess()
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
  <section class="flex min-h-[430px] min-w-0 flex-col rounded-xl border bg-background xl:min-h-0">
    <header class="flex items-center justify-between border-b p-4"><h2 class="font-semibold">Корзина</h2><Button v-if="items.length" size="sm" variant="ghost" @click="$emit('clear')">Очистить</Button></header>
    <div class="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
      <article v-for="r in items" :key="r.key" class="space-y-1.5 rounded-lg border p-2">
        <div class="flex items-center gap-2">
          <strong class="mr-auto min-w-0 break-words">{{r.name}}</strong>
          <span class="shrink-0 text-sm font-medium tabular-nums">{{money(cents(r.qty*r.actual))}}</span>
          <Button variant="ghost" size="icon" class="size-7 shrink-0" aria-label="Убрать из корзины" @click="$emit('remove',r.key)"><Trash2 class="size-4"/></Button>
        </div>
        <div class="grid grid-cols-3 gap-2 text-xs">
          <label class="min-w-0">Единица<select v-model="r.mode" class="block h-8 w-full rounded-md border bg-background" @change="unit(r)"><option v-for="m in modes(r)" :key="m.key" :value="m.key">{{m.unit}}{{m.key==='content'?' (внутри)':''}}</option></select></label>
          <label class="min-w-0">Количество<Input v-model.number="r.qty" class="h-8 px-2" type="number" min="0" step="any"/></label>
          <label class="min-w-0">Цена, сом<Input v-model.number="r.actual" :disabled="!can('sales.price')" class="h-8 px-2" type="number" min="0" step="any"/></label>
        </div>
      </article>
      <p v-if="!items.length" class="p-4 text-center text-muted-foreground">Выберите товары справа</p>
    </div>
    <footer class="flex items-center justify-between border-t px-4 py-2"><strong>Итого {{money(sum(items))}}</strong><Button :disabled="!valid || !canPay" @click="$emit('pay')">Оплата</Button></footer>
  </section>
</template>
