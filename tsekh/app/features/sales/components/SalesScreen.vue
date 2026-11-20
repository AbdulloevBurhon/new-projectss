<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Button, Input, toast } from '@obshaya/ui'
import { Plus } from '@lucide/vue'
import { catalog, modes, type Catalog, type Goods, type Line } from '../../../../endpoints/sales/service'
import SaleCart from './SaleCart.vue'
import SalePayment from './SalePayment.vue'
const data = ref<Catalog>({products:[],accounts:[],warehouses:[]})
const warehouse=ref(''), account=ref(''), search=ref(''), pay=ref(false)
const cart=ref<Line[]>([])
async function refresh() {
  try {
    data.value=await catalog()
    warehouse.value ||= data.value.warehouses[0]?.id ?? ''
    account.value ||= data.value.accounts[0]?.id ?? ''
  } catch { toast.error('Не удалось загрузить каталог.') }
}
onMounted(refresh)
watch(warehouse,()=>{cart.value=[]})
const products=computed(()=>data.value.products.filter(p=>p.warehouse===warehouse.value && p.name.toLowerCase().includes(search.value.trim().toLowerCase())))
function add(p:Goods){
  cart.value.push({...p,key:crypto.randomUUID(),mode:modes(p)[0].key,qty:1,actual:p.price})
}
async function completed(){pay.value=false;cart.value=[];await refresh()}
</script>
<template>
  <main class="p-4 sm:p-6">
    <h1 class="mb-5 text-2xl font-semibold">Продажа</h1>
    <div class="grid gap-4 xl:h-[calc(100vh-8rem)] xl:min-h-[430px] xl:grid-cols-[minmax(340px,0.82fr)_minmax(0,1.4fr)]">
      <SaleCart :items="cart" @clear="cart=[]" :can-pay="!!account" @remove="key=>cart=cart.filter(r=>r.key!==key)" @pay="pay=true" />
      <section class="flex min-h-0 flex-col gap-4 rounded-xl border bg-background p-3">
        <div class="flex flex-wrap gap-2">
          <Input v-model="search" class="max-w-xs" placeholder="Поиск товаров" />
          <select v-model="warehouse" aria-label="Склад" class="rounded-md border bg-background px-3" :disabled="!!cart.length"><option v-for="w in data.warehouses" :key="w.id" :value="w.id">{{ w.name }}</option></select>
          <select v-model="account" aria-label="Счёт" class="rounded-md border bg-background px-3"><option v-for="a in data.accounts" :key="a.id" :value="a.id">{{ a.name }}</option></select>
        </div>
        <div class="space-y-2 overflow-y-auto">
          <article v-for="p in products" :key="p.id" class="flex items-center gap-3 rounded-lg border p-3">
            <strong class="mr-auto">{{ p.name }}</strong><span>{{ p.stock }} {{ p.unit }}</span><span>{{ p.price }} сом</span>
            <Button size="icon" variant="outline" :aria-label="'В корзину '+p.name" @click="add(p)"><Plus class="size-4"/></Button>
          </article>
          <p v-if="!products.length" class="p-4 text-muted-foreground">Товаров в наличии нет</p>
        </div>
      </section>
    </div>
    <SalePayment v-if="pay" :items="cart" :warehouse="warehouse" :account="account" @close="pay=false" @done="completed"/>
  </main>
</template>
