<script setup lang="ts">
import { computed,onMounted,ref } from 'vue'
import { Plus } from '@lucide/vue'
import { Button,Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle,Input,toast } from '@obshaya/ui'
import { cents,customers,money,saveClient,sum,type Client,type Line } from '../../../../endpoints/sales/service'
import ClientFormDialog from '../../clients/components/ClientFormDialog.vue'
import { useEmployeeAccess } from '../../workers/composables/useEmployeeAccess'
import { printReceipt } from '../printReceipt'
import { printerError } from '../../../../endpoints/settings/printer/printer.service'
const props=defineProps<{items:Line[];account:string;warehouse:string}>()
const emit=defineEmits<{close:[];done:[]}>()
const total=computed(()=>sum(props.items))
const discount=ref(0), tender=ref(total.value/100), client=ref(''), query=ref('')
const { profile, can } = useEmployeeAccess()
const print=ref(false),busy=ref(false),error=ref('')
const people=ref<Client[]>([]),picker=ref(false),create=ref(false)
const due=computed(()=>total.value-cents(discount.value))
const debt=computed(()=>Math.max(0,due.value-cents(tender.value)))
const found=computed(()=>people.value.filter(c=>(c.name+' '+c.phone).toLowerCase().includes(query.value.toLowerCase())))
const id=crypto.randomUUID()
onMounted(async()=>{try{people.value=await customers()}catch{error.value='Не удалось загрузить клиентов.'}})
async function add(name:string,phone:string){
  try {const result=await saveClient(name,phone) as {id:string};people.value=await customers();client.value=result.id;create.value=false;picker.value=false}
  catch{error.value='Не удалось сохранить клиента.'}
}
async function submit(){
  if(busy.value || due.value<0 || (debt.value && !client.value))return
  busy.value=true;error.value=''
  try {
    await $fetch('/api/sales/checkout',{method:'POST',body:{id,warehouse:props.warehouse,account:props.account,client:client.value||null,
      seller:profile.value?.name ?? 'Админ',role:profile.value?.role ?? 'Администратор',discount:cents(discount.value),tender:cents(tender.value),
      lines:props.items.map(r=>({id:r.id,qty:Number(r.qty),mode:r.mode,price:Number(r.actual)}))}})
  } catch(e:any){error.value=e.data?.data?.message||e.data?.statusMessage||'Не удалось провести продажу.';busy.value=false;return}
  try {if(print.value) await printReceipt(id)}
  catch (cause) { toast.error('Продажа сохранена. ' + printerError(cause)) }
  finally {emit('done')}
}
</script>
<template>
  <Dialog :open="true" @update:open="open=>{if(!open&&!busy)emit('close')}">
    <DialogContent><DialogHeader><DialogTitle>Оплата</DialogTitle><DialogDescription class="sr-only">Подтвердите сумму и условия оплаты.</DialogDescription></DialogHeader>
      <form class="grid gap-3" @submit.prevent="submit">
        <div class="relative flex gap-2">
          <Button type="button" variant="outline" class="flex-1" @click="picker=!picker">{{people.find(c=>c.id===client)?.name||'Выбрать клиента'}}</Button>
          <Button type="button" variant="outline" size="icon" v-if="can('clients')" aria-label="Новый клиент" @click="create=true"><Plus class="size-4"/></Button>
          <div v-if="picker" class="absolute top-full z-10 mt-1 w-full rounded-md border bg-background p-2 shadow">
            <Input v-model="query" placeholder="Поиск клиента"/>
            <div class="max-h-36 overflow-y-auto"><button v-for="c in found" :key="c.id" class="block h-9 w-full text-left" type="button" @click="client=c.id;picker=false">{{c.name}} · {{c.phone}}</button></div>
            <button type="button" @click="client='';picker=false">Без клиента</button>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <label>От клиента, сом<Input v-model.number="tender" type="number" min="0" step="0.01" required/></label>
          <div>Итого к оплате<strong class="block">{{money(due)}}</strong></div>
          <label>Скидка, сом<Input v-model.number="discount" type="number" min="0" :disabled="!can('sales.discount')" :max="total/100" step="0.01" required/></label>
          <div>Долг<strong class="block">{{money(debt)}}</strong></div>
        </div>
        <p v-if="cents(tender)>due">Сдача {{money(cents(tender)-due)}}</p>
        <p v-if="debt && !can('sales.debt')" class="text-sm">Продажа в долг недоступна.</p>
        <p v-else-if="debt && !client" class="text-sm">Для продажи в долг выберите клиента.</p>
        <label><input v-model="print" type="checkbox"/> Печать чека</label>
        <p v-if="error" role="alert" class="text-destructive">{{error}}</p>
        <Button type="submit" :disabled="busy || due<0 || (!!debt && (!client || !can('sales.debt')))">Провести продажу</Button>
      </form>
    </DialogContent>
  </Dialog>
  <ClientFormDialog v-if="create" @save="add" @close="create=false"/>
</template>
