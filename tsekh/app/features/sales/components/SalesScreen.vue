<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { Input, toast } from '@obshaya/ui'
import { useEmployeeAccess } from '../../workers/composables/useEmployeeAccess'
import { ArrowLeftRight } from '@lucide/vue'
import { catalogOptions, type Catalog, type Line } from '../../../../endpoints/sales/service'
import { barcodeMaxLength } from '../../../../endpoints/warehouse/products/products.types'
import { usePagedSalesCatalog } from '../composables/usePagedSalesCatalog'
import { addByBarcode, saleLine } from '../scanBarcode'
import BarcodeScanner from '../../../components/barcode/BarcodeScanner.vue'
import SaleCart from './SaleCart.vue'
import SalePayment from './SalePayment.vue'
import SalesProductList from './SalesProductList.vue'
const { can } = useEmployeeAccess()
const data = ref<Catalog>({products:[],accounts:[],warehouses:[]})
const warehouse=ref(''), account=ref(''), search=ref(''), pay=ref(false)
const cart=ref<Line[]>([])
const loading = ref(true)
const panels = ref<HTMLElement | null>(null)
const {rows, pending, more, error, loadMore, refresh: refreshProducts, lookup} = usePagedSalesCatalog(warehouse, search)
const cartWidth = ref(37)
const minCartWidth = 28
const maxCartWidth = 65
let drag: { pointerId: number; x: number; initialWidth: number } | undefined

function setCartWidth(width: number) {
  cartWidth.value = Math.min(maxCartWidth, Math.max(minCartWidth, Math.round(width)))
}

function startResize(event: PointerEvent) {
  if (event.button !== 0 || drag) return
  const handle = event.currentTarget as HTMLElement
  handle.setPointerCapture(event.pointerId)
  drag = { pointerId: event.pointerId, x: event.clientX, initialWidth: cartWidth.value }
}

function resize(event: PointerEvent) {
  if (!drag || drag.pointerId !== event.pointerId || !panels.value) return
  const handle = event.currentTarget as HTMLElement
  const available = panels.value.clientWidth - handle.offsetWidth
  if (available > 0) setCartWidth(drag.initialWidth + (event.clientX - drag.x) * 100 / available)
}

function resizeWithKey(event: KeyboardEvent) {
  const widths: Partial<Record<string, number>> = {
    ArrowLeft: cartWidth.value - 4,
    ArrowRight: cartWidth.value + 4,
    Home: minCartWidth,
    End: maxCartWidth,
  }
  const width = widths[event.key]
  if (width === undefined) return
  event.preventDefault()
  setCartWidth(width)
}
async function refresh() {
  loading.value = true
  try {
    data.value=await catalogOptions()
    warehouse.value ||= data.value.warehouses[0]?.id ?? ''
    account.value ||= data.value.accounts[0]?.id ?? ''
  } catch { toast.error('Не удалось загрузить каталог.') }
  finally { loading.value = false }
}
onMounted(refresh)
watch(warehouse,()=>{cart.value=[]})
let scanVersion = 0
watch([warehouse, pay], () => { scanVersion++ }, { flush: 'sync' })
async function scan(code: string) {
  const version = scanVersion
  try {
    const matches = code.length > barcodeMaxLength ? [] : await lookup(code)
    if (version === scanVersion) return addByBarcode(code, matches, cart.value)
  } catch {
    if (version === scanVersion) return { ok: false as const, title: 'Не удалось найти товар', message: 'Повторите сканирование.' }
  }
}
function completed(){pay.value=false;cart.value=[];refreshProducts()}
</script>
<template>
  <main class="p-4 sm:p-6">
    <h1 class="mb-5 text-2xl font-semibold">Продажа</h1>
    <div ref="panels" class="grid gap-4 xl:h-[calc(100vh-8rem)] xl:min-h-[430px] xl:grid-cols-[minmax(0,var(--cart-width))_2rem_minmax(0,var(--catalog-width))] xl:gap-0"
      :style="{ '--cart-width': `${cartWidth}fr`, '--catalog-width': `${100 - cartWidth}fr` }">
      <SaleCart id="sales-cart" :items="cart" @clear="cart=[]" :can-pay="!!account" @remove="key=>cart=cart.filter(r=>r.key!==key)" @pay="pay=true" />
      <div role="separator" aria-label="Ширина корзины" aria-controls="sales-cart" aria-orientation="vertical"
        :aria-valuemin="minCartWidth" :aria-valuemax="maxCartWidth" :aria-valuenow="cartWidth" :aria-valuetext="`${cartWidth}%`" tabindex="0"
        class="hidden cursor-col-resize touch-none select-none items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring xl:flex"
        @pointerdown="startResize" @pointermove="resize" @lostpointercapture="drag = undefined" @keydown="resizeWithKey">
        <span class="grid h-9 w-6 place-items-center rounded-md border bg-background shadow-sm"><ArrowLeftRight class="size-3.5" aria-hidden="true" /></span>
      </div>
      <section class="flex min-h-0 min-w-0 flex-col gap-3 rounded-xl border bg-background p-3">
        <div class="flex flex-wrap items-start gap-2">
          <Input v-model="search" class="w-48 grow sm:max-w-xs" placeholder="Поиск товаров" />
          <select v-model="warehouse" aria-label="Склад" class="h-9 rounded-md border bg-background px-3" :disabled="!!cart.length || !can('sales.settings')"><option v-for="w in data.warehouses" :key="w.id" :value="w.id">{{ w.name }}</option></select>
          <select v-model="account" aria-label="Счёт" :disabled="!can('sales.settings')" class="h-9 rounded-md border bg-background px-3"><option v-for="a in data.accounts" :key="a.id" :value="a.id">{{ a.name }}</option></select>
        </div>
        <BarcodeScanner :key="warehouse" :scan="scan" :disabled="loading || pay || !warehouse" />
        <SalesProductList :rows="rows" :pending="pending || loading" :more="more" :error="error"
          :list-key="JSON.stringify([warehouse, search])" @add="cart.push(saleLine($event))" @more="loadMore" />
      </section>
    </div>
    <SalePayment v-if="pay" :items="cart" :warehouse="warehouse" :account="account" @close="pay=false" @done="completed"/>
  </main>
</template>
