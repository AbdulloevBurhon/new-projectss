<script setup lang="ts">
import { computed,ref } from 'vue'
import { Dialog,DialogContent,DialogHeader,DialogTitle,Input,Button } from '@obshaya/ui'
import type { Goods,Location } from '../../../../endpoints/sales/service'
const props=defineProps<{mode:'transfer'|'adjust';goods:Goods[];warehouses:Location[]}>()
const emit=defineEmits<{close:[];done:[]}>()
const lot=ref(''),target=ref(''),qty=ref<number>(),busy=ref(false),error=ref('')
const selected=computed(()=>props.goods.find(g=>g.id===lot.value))
async function submit(){
  if(busy.value || !selected.value || !qty.value)return
  busy.value=true
  try {await $fetch('/api/sales/movement',{method:'POST',body:{id:crypto.randomUUID(),lot:lot.value,target:props.mode==='transfer'?target.value:null,qty:Number(qty.value)}});emit('done')}
  catch{error.value='Проверьте количество, склад назначения и доступный остаток.'}
  finally{busy.value=false}
}
</script>
<template>
 <Dialog :open="true" @update:open="v=>{if(!v&&!busy)emit('close')}"><DialogContent>
 <DialogHeader><DialogTitle>{{mode==='transfer'?'Перемещение':'Корректировка'}}</DialogTitle></DialogHeader>
 <form class="grid gap-3" @submit.prevent="submit">
 <label>Товар и склад<select v-model="lot" required class="block w-full rounded-md border p-2" @change="target=''"><option value="" disabled>Выберите товар</option><option v-for="g in goods" :key="g.id" :value="g.id">{{g.name}} · {{warehouses.find(w=>w.id===g.warehouse)?.name}} · {{g.stock}} {{g.unit}}</option></select></label>
 <label v-if="mode==='transfer'">На склад<select v-model="target" required class="block w-full rounded-md border p-2"><option value="" disabled>Выберите склад</option><option v-for="w in warehouses.filter(w=>w.id!==selected?.warehouse)" :key="w.id" :value="w.id">{{w.name}}</option></select></label>
 <label>{{mode==='transfer'?'Количество':'Изменение остатка (+ или −)'}} {{selected?.unit}}<Input v-model.number="qty" required type="number" step="any" :min="mode==='transfer'?0.000001:undefined"/></label>
 <p v-if="error" role="alert">{{error}}</p><Button type="submit" :disabled="busy || !qty">Провести</Button>
 </form></DialogContent></Dialog>
</template>
