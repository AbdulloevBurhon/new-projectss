<script setup lang="ts">
import { Archive, ArrowLeftRight, Boxes, Inbox, Info, NotebookPen, Pencil, Plus, RefreshCw, SlidersHorizontal, Trash2, Warehouse as WarehouseIcon } from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Button, DataTable, Input, Tabs, TabsContent, TabsList, TabsTrigger, toast } from '@obshaya/ui'
import { warehousesKey } from '../../../../endpoints/warehouse/get-warehouses/get-warehouses.service'
import { useGetWarehousesStore } from '../../../../endpoints/warehouse/get-warehouses/get-warehouses.store'
import { warehouseTypeLabels, type Warehouse, type WarehouseDraft } from '../../../../endpoints/warehouse/get-warehouses/get-warehouses.types'
import { useCreateWarehouseStore } from '../../../../endpoints/warehouse/create-warehouse/create-warehouse.store'
import { useUpdateWarehouseStore } from '../../../../endpoints/warehouse/update-warehouse/update-warehouse.store'
import { useDeleteWarehouseStore } from '../../../../endpoints/warehouse/delete-warehouse/delete-warehouse.store'
import { productsKey } from '../../../../endpoints/warehouse/products/products.service'
import { useProductsStore } from '../../../../endpoints/warehouse/products/products.store'
import type { Product, ProductDraft } from '../../../../endpoints/warehouse/products/products.types'
import WarehouseFormDialog from './WarehouseFormDialog.vue'
import DeleteWarehouseDialog from './DeleteWarehouseDialog.vue'
import ProductFormDialog from './ProductFormDialog.vue'
import DeleteProductDialog from './DeleteProductDialog.vue'
import { techCardsKey } from '../../../../endpoints/warehouse/techcards/techcards.service'
import { useTechCardsStore } from '../../../../endpoints/warehouse/techcards/techcards.store'
import type { TechCard, TechCardDraft } from '../../../../endpoints/warehouse/techcards/techcards.types'
import { accountsKey, getAccounts, type AccountRecord } from '../../../../endpoints/accounts/accounts.service'
import { loadAccounts as fetchAccounts } from '../../../../endpoints/accounts/get-accounts/store'
import TechCardFormDialog from './TechCardFormDialog.vue'
import TechCardInfoDialog from './TechCardInfoDialog.vue'
import DeleteTechCardDialog from './DeleteTechCardDialog.vue'
import { useStockReceipts } from '../composables/useStockReceipts'

const { state, load } = useGetWarehousesStore()
const create = useCreateWarehouseStore()
const update = useUpdateWarehouseStore()
const remove = useDeleteWarehouseStore()
const products = useProductsStore()
const techCards = useTechCardsStore()
const receiptWarehouseId = ref('')
const receiptAccountId = ref('')
const accounts = useState('accounts', () => [] as AccountRecord[])
const nuxt = useNuxtApp()
const refreshAccounts = () => nuxt.runWithContext(fetchAccounts)
const dialogOpen = ref(false)
const editing = ref<Warehouse | null>(null)
const deleting = ref<Warehouse | null>(null)
const deleteOpen = ref(false)
const productDialogOpen = ref(false)
const selectedProduct = ref<Product | null>(null)
const productDeleteOpen = ref(false)
const deletingProduct = ref<Product | null>(null)
const productSearch = ref('')
const warehouseSearch = ref('')
const techCardSearch = ref('')
const receiptSearch = ref('')
const {
  posted, latest, lines: receiptDrafts, errors: receiptErrors, busy: receiptBusy, loadError: receiptLoadError,
  seconds: receiptSeconds, edit: updateReceiptDraft, toggle: toggleReceipt, salePriceFor, selectionLocked,
} = useStockReceipts(receiptWarehouseId, receiptAccountId, () => products.state.rows, refreshAccounts)
const balanceWarehouseId = ref('')
const balanceSearch = ref('')
const historyWarehouseId = ref('')
const historyFrom = ref('')
const historyTo = ref('')
const techCardDialogOpen = ref(false)
const selectedTechCard = ref<TechCard | null>(null)
const infoTechCard = ref<TechCard | null>(null)
const techCardInfoOpen = ref(false)
const deleteTechCardOpen = ref(false)
const deletingTechCard = ref<TechCard | null>(null)
const activeTab = ref('warehouses')
const tabs = [
  { value: 'warehouses', label: 'Склады' },
  { value: 'balance', label: 'Остатки' },
  { value: 'history', label: 'История' },
  { value: 'products', label: 'Товары' },
  { value: 'techcards', label: 'Техкарты' },
  { value: 'receipts', label: 'Поступление' },
]
const activeTitle = computed(() => tabs.find(tab => tab.value === activeTab.value)?.label ?? 'Склады')
const visibleProducts = computed(() => products.state.rows.filter(product =>
  product.name.toLocaleLowerCase('ru').includes(productSearch.value.trim().toLocaleLowerCase('ru')),
))
const visibleWarehouses = computed(() => state.rows.filter(warehouse => warehouse.name.toLocaleLowerCase('ru').includes(warehouseSearch.value.trim().toLocaleLowerCase('ru'))))
const visibleTechCards = computed(() => techCards.state.rows.filter(card => card.name.toLocaleLowerCase('ru').includes(techCardSearch.value.trim().toLocaleLowerCase('ru'))))
const visibleReceiptProducts = computed(() => products.state.rows.filter(product => product.name.toLocaleLowerCase('ru').includes(receiptSearch.value.trim().toLocaleLowerCase('ru'))))
const receiptAccount = computed(() => accounts.value.find(account => account.id === receiptAccountId.value) ?? null)
const numberFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 6 })
const operationDate = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'medium' })
const warehouseNames = computed(() => {
  const names = new Map(state.rows.map(row => [row.id, row.name]))
  for (const row of posted.value) {
    if (!names.has(row.warehouseId)) names.set(row.warehouseId, row.warehouseName)
  }
  return names
})
const listedWarehouses = computed(() => [...warehouseNames.value].map(([id, name]) => ({ id, name })))
const historyRows = computed(() => posted.value.filter(row => {
  const date = new Date(row.postedAt!)
  const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return (!historyWarehouseId.value || row.warehouseId === historyWarehouseId.value)
    && (!historyFrom.value || day >= historyFrom.value)
    && (!historyTo.value || day <= historyTo.value)
}))
const historyTotal = computed(() => historyRows.value.reduce((total, row) => total + (row.total ?? 0), 0))
const balanceRows = computed(() => {
  const totals = new Map<string, { id: string; product: string; warehouse: string; unit: string; stock: number; contentStock: number; contentUnit: string | null }>()
  for (const row of posted.value) {
    if (balanceWarehouseId.value && row.warehouseId !== balanceWarehouseId.value) continue
    const id = JSON.stringify([row.warehouseId, row.productId, row.unit, row.contentUnit])
    let total = totals.get(id)
    if (!total) {
      const product = products.state.rows.find(product => product.id === row.productId)
      total = {
        id, product: product?.name ?? row.productName, warehouse: warehouseNames.value.get(row.warehouseId) ?? row.warehouseName,
        unit: row.unit, stock: 0, contentStock: 0, contentUnit: row.contentUnit,
      }
      totals.set(id, total)
    }
    total.stock += row.quantity ?? 0
    total.contentStock += (row.quantity ?? 0) * (row.quantityPerPiece ?? 0)
  }
  const search = balanceSearch.value.trim().toLocaleLowerCase('ru')
  return [...totals.values()].filter(row => row.product.toLocaleLowerCase('ru').includes(search))
})
const balanceColumns = [
  { key: 'product', label: 'Товар' },
  { key: 'warehouse', label: 'Склад' },
  { key: 'stock', label: 'Остаток', align: 'right' as const },
  { key: 'contentStock', label: 'Остаток содержимого', align: 'right' as const },
  { key: 'opened', label: 'Открыто', align: 'right' as const },
  { key: 'openedRemaining', label: 'Остаток из открытого', align: 'right' as const },
]
const historyColumns = [
  { key: 'operation', label: 'Операция, дата и время' },
  { key: 'product', label: 'Товар' },
  { key: 'warehouse', label: 'Склад' },
  { key: 'worker', label: 'Рабочий' },
  { key: 'quantity', label: 'Количество', align: 'right' as const },
  { key: 'opened', label: 'Открыто', align: 'right' as const },
  { key: 'sum', label: 'Сумма', align: 'right' as const },
]
const productColumns = [
  { key: 'name', label: 'Название' },
  { key: 'unit', label: 'Ед. изм.' },
  { key: 'actions', label: 'Действия', align: 'right' as const },
]
const techCardColumns = [
  { key: 'name', label: 'Название техкарты' },
  { key: 'productionCost', label: 'Производство', align: 'right' as const },
  { key: 'salePrice', label: 'Продажа', align: 'right' as const },
  { key: 'actions', label: 'Действия', align: 'right' as const },
]
const receiptColumns = [
  { key: 'product', label: 'Товар' },
  { key: 'quantity', label: 'Количество', class: 'w-32' },
  { key: 'unitPrice', label: 'Цена закупки', class: 'w-52' },
  { key: 'salePrice', label: 'Цена продажи', class: 'w-52' },
  { key: 'sum', label: 'Сумма закупки', align: 'right' as const },
  { key: 'revenue', label: 'Ожидаемая выручка', align: 'right' as const },
  { key: 'actions', label: 'Действия', align: 'right' as const },
]
const formStore = computed(() => editing.value ? update : create)
const columns = [
  { key: 'number', label: '№', class: 'w-16' },
  { key: 'name', label: 'Название' },
  { key: 'type', label: 'Тип склада' },
  { key: 'actions', label: 'Действия', align: 'right' as const },
]

function typeLabel(type: Warehouse['type']) {
  return type ? warehouseTypeLabels[type] : '—'
}

function openForm(warehouse: Warehouse | null = null) {
  editing.value = warehouse
  formStore.value.error.value = ''
  dialogOpen.value = true
}

function openDelete(warehouse: Warehouse) {
  deleting.value = warehouse
  remove.error.value = ''
  deleteOpen.value = true
}

function handleStorage(event: StorageEvent) {
  if (event.key === warehousesKey || event.key === null) load()
  if (event.key === accountsKey || event.key === null) {
    try {
      accounts.value = getAccounts()
    } catch {
      toast.error('Не удалось загрузить счета из хранилища.')
    }
  }
  if (event.key === productsKey || event.key === null) products.load()
  if (event.key === techCardsKey || event.key === null) techCards.load()
}

function money(value: number) { return new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value) }
function receiptTotal(id: string) {
  const line = receiptDrafts[id]
  if (!line?.quantity || !line.unitPrice) return null
  const sum = Number(line.quantity) * Number(line.unitPrice)
  return Number.isFinite(sum) && sum >= 0 ? Math.round((sum + Number.EPSILON) * 100) / 100 : null
}
function receiptProduct(product: Product) {
  const receipt = latest.value[product.id]
  return receipt?.status === 'pending' ? receipt : product
}
function expectedRevenue(product: Product) {
  const quantity = Number(receiptDrafts[product.id]?.quantity)
  const price = salePriceFor(product)
  const pack = receiptProduct(product)
  const total = quantity * (pack.quantityPerPiece ?? 1) * Number(price)
  return price.trim() && quantity > 0 && Number(price) >= 0 && Number(price) <= 1_000_000 && Number.isFinite(total)
    ? `${money(total)} сом` : '—'
}
function receiptFeedback(id: string) {
  if (receiptErrors[id]) return receiptErrors[id]
  const row = latest.value[id]
  if (row?.status === 'failed') return row.error
  const account = accounts.value.find(account => account.id === row?.accountId)
  const total = receiptTotal(id)
  return row?.status === 'pending' && account && total !== null && Math.round(account.amount * 100) < Math.round(total * 100)
    ? 'Недостаточно средств на счёте.' : ''
}
function openTechCardForm(card: TechCard | null = null) {
  selectedTechCard.value = card
  techCards.state.error = ''
  techCardDialogOpen.value = true
}
function openTechCardInfo(card: TechCard) { infoTechCard.value = card; techCardInfoOpen.value = true }
function openTechCardDelete(card: TechCard) { deletingTechCard.value = card; techCards.state.error = ''; deleteTechCardOpen.value = true }
async function saveTechCard(draft: TechCardDraft) {
  if (!await techCards.save(draft, products.state.rows, selectedTechCard.value?.id)) return
  techCardDialogOpen.value = false
  toast.success(selectedTechCard.value ? 'Техкарта обновлена.' : 'Техкарта добавлена.')
}
async function confirmDeleteTechCard() {
  if (!deletingTechCard.value || !await techCards.remove(deletingTechCard.value.id)) return
  deleteTechCardOpen.value = false
  toast.success('Техкарта удалена.')
}

function openProductForm(product: Product | null = null) {
  selectedProduct.value = product
  products.state.error = ''
  productDialogOpen.value = true
}

function openProductDelete(product: Product) {
  deletingProduct.value = product
  products.state.error = ''
  productDeleteOpen.value = true
}

async function saveProduct(draft: ProductDraft) {
  if (!await products.save(draft, selectedProduct.value?.id)) return
  productDialogOpen.value = false
  toast.success(selectedProduct.value ? 'Товар изменён.' : 'Товар добавлен.')
}

async function confirmDeleteProduct() {
  if (!deletingProduct.value || !await products.remove(deletingProduct.value.id)) return
  productDeleteOpen.value = false
  toast.success('Товар удалён.')
}

async function save(draft: WarehouseDraft) {
  const warehouse = editing.value
  const saved = warehouse
    ? await update.execute({ id: warehouse.id, ...draft })
    : await create.execute(draft)
  if (!saved) return
  load()
  dialogOpen.value = false
  toast.success(warehouse ? 'Склад обновлён.' : 'Склад добавлен.')
}

async function confirmDelete() {
  if (!deleting.value || !await remove.execute({ id: deleting.value.id })) return
  load()
  deleteOpen.value = false
  toast.success('Склад удалён.')
}

onMounted(async () => {
  load()
  try {
    await refreshAccounts()
  } catch {
    toast.error('Не удалось загрузить счета из хранилища.')
  }
  products.load()
  techCards.load()
  window.addEventListener('storage', handleStorage)
})
onBeforeUnmount(() => window.removeEventListener('storage', handleStorage))
</script>

<template>
  <section class="w-full p-5 text-slate-900 sm:p-8" aria-labelledby="warehouses-title">
    <h1 id="warehouses-title" class="mt-2 text-3xl font-semibold tracking-tight">{{ activeTitle }}</h1>
    <Tabs v-model:model-value="activeTab" class="mt-6 gap-5">
      <div class="flex flex-wrap items-center gap-2">
        <TabsList class="h-auto w-fit flex-wrap rounded-xl bg-muted p-1.5">
          <TabsTrigger value="warehouses" class="h-9 flex-none rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <WarehouseIcon class="size-4 text-blue-600" />
            Склады
          </TabsTrigger>
          <TabsTrigger value="balance" class="h-9 flex-none rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Boxes class="size-4 text-blue-600" />
            Остатки
          </TabsTrigger>
          <TabsTrigger value="history" class="h-9 flex-none rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"><RefreshCw class="size-4 text-blue-600" />История</TabsTrigger>
          <TabsTrigger value="products" class="h-9 flex-none rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"><Archive class="size-4 text-blue-600" />Товары</TabsTrigger>
          <TabsTrigger value="techcards" class="h-9 flex-none rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"><NotebookPen class="size-4 text-blue-600" />Техкарты</TabsTrigger>
          <TabsTrigger value="receipts" class="h-9 flex-none rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"><Inbox class="size-4 text-blue-600" />Поступление</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="warehouses" class="space-y-4">
        <div class="flex flex-wrap items-center gap-3">
          <Input v-model="warehouseSearch" class="max-w-xs" type="search" placeholder="Поиск по названию" aria-label="Поиск склада" />
          <Button class="ml-auto" :disabled="state.loading || !!state.error" @click="openForm()">
            <Plus class="size-4" />
            Склад
          </Button>
        </div>
        <p v-if="state.loading" class="text-sm text-muted-foreground" role="status">Загрузка складов…</p>
        <p v-else-if="state.error" class="text-sm text-destructive" role="alert">{{ state.error }}</p>
        <DataTable v-else :columns="columns" :rows="visibleWarehouses" :empty-text="warehouseSearch.trim() ? 'Совпадений не найдено' : 'Складов пока нет'">
          <template #cell-number="{ index }">{{ index + 1 }}</template>
          <template #cell-type="{ row }">{{ typeLabel(row.type) }}</template>
          <template #cell-actions="{ row }">
            <Button size="icon" variant="ghost" :aria-label="`Редактировать склад «${row.name}»`" @click="openForm(row)">
              <Pencil class="size-4 text-blue-600" />
            </Button>
            <Button size="icon" variant="ghost" :aria-label="`Удалить склад «${row.name}»`" @click="openDelete(row)">
              <Trash2 class="size-4 text-destructive" />
            </Button>
          </template>
        </DataTable>
      </TabsContent>

      <TabsContent value="balance" class="space-y-4">
        <div class="flex flex-wrap items-center gap-3">
          <select v-model="balanceWarehouseId" aria-label="Склад" class="h-10 min-w-48 rounded-md border bg-background px-3 text-sm"><option value="">Все склады</option><option v-for="warehouse in listedWarehouses" :key="warehouse.id" :value="warehouse.id">{{ warehouse.name }}</option></select>
          <Input v-model="balanceSearch" class="max-w-xs" type="search" placeholder="Поиск по названию" aria-label="Поиск товара" />
          <div class="ml-auto flex flex-wrap gap-2">
            <Button type="button" variant="outline"><ArrowLeftRight class="size-4" />Перемещение</Button>
            <Button type="button" variant="outline"><SlidersHorizontal class="size-4" />Корректировка</Button>
          </div>
        </div>
        <p v-if="receiptLoadError" class="text-sm text-destructive" role="alert">{{ receiptLoadError }}</p>
        <DataTable :columns="balanceColumns" :rows="balanceRows" empty-text="Остатков пока нет">
          <template #cell-stock="{ row }">{{ numberFormat.format(row.stock) }} {{ row.unit }}</template>
          <template #cell-contentStock="{ row }">{{ row.contentUnit ? `${numberFormat.format(row.contentStock)} ${row.contentUnit}` : '—' }}</template>
          <template #cell-opened="{ row }">{{ row.contentUnit || row.unit === 'уп' ? `0 ${row.unit}` : '—' }}</template>
          <template #cell-openedRemaining="{ row }">{{ row.contentUnit ? `0 ${row.contentUnit}` : '—' }}</template>
        </DataTable>
      </TabsContent>

      <TabsContent value="history" class="space-y-4">
        <div class="grid gap-3 sm:grid-cols-3">
          <div class="rounded-xl border bg-background p-4"><p class="text-sm text-muted-foreground">Поступления</p><p class="mt-1 text-xl font-semibold">{{ historyRows.length }}</p></div>
          <div class="rounded-xl border bg-background p-4"><p class="text-sm text-muted-foreground">Расходы</p><p class="mt-1 text-xl font-semibold">—</p></div>
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
          <template #cell-operation="{ row }">Приход <small class="block text-muted-foreground">{{ operationDate.format(row.postedAt) }}</small></template>
          <template #cell-product="{ row }">{{ row.productName }}</template>
          <template #cell-warehouse="{ row }">{{ row.warehouseName }}</template>
          <template #cell-quantity="{ row }">{{ numberFormat.format(row.quantity) }} {{ row.unit }}</template>
          <template #cell-opened="{ row }">{{ row.unit === 'уп' || row.contentUnit ? '0' : '—' }}</template>
          <template #cell-sum="{ row }">{{ money(row.total) }} сом</template>
        </DataTable>
      </TabsContent>

      <TabsContent value="products" class="space-y-4">
        <div class="flex flex-wrap items-center gap-3">
          <Input v-model="productSearch" class="max-w-xs" type="search" placeholder="Поиск по названию" aria-label="Поиск товара" />
          <Button class="ml-auto" :disabled="products.state.loading || !!products.state.error" @click="openProductForm()"><Plus class="size-4" />Товар</Button>
        </div>
        <p v-if="products.state.loading" class="text-sm text-muted-foreground" role="status">Загрузка товаров…</p>
        <p v-else-if="products.state.error" class="text-sm text-destructive" role="alert">{{ products.state.error }}</p>
        <DataTable v-else :columns="productColumns" :rows="visibleProducts" :empty-text="productSearch.trim() ? 'Совпадений не найдено' : 'Товаров пока нет'">
          <template #cell-unit="{ row }">
            <span>{{ row.unit }}</span>
            <small v-if="row.quantityPerPiece" class="block text-muted-foreground">{{ row.quantityPerPiece }} {{ row.contentUnit }} в 1 {{ row.unit }}</small>
          </template>
          <template #cell-actions="{ row }">
            <div class="flex justify-end gap-1">
              <Button size="icon" variant="ghost" :aria-label="`Изменить товар ${row.name}`" @click="openProductForm(row)"><Pencil class="size-4 text-blue-600" /></Button>
              <Button size="icon" variant="ghost" :aria-label="`Удалить товар ${row.name}`" @click="openProductDelete(row)"><Trash2 class="size-4 text-destructive" /></Button>
            </div>
          </template>
        </DataTable>
      </TabsContent>

      <TabsContent value="techcards" class="space-y-4">
        <div class="flex flex-wrap items-center gap-3">
          <Input v-model="techCardSearch" class="max-w-xs" type="search" placeholder="Поиск по названию" aria-label="Поиск техкарты" />
          <Button class="ml-auto" :disabled="techCards.state.loading || !!techCards.state.error || products.state.loading || !!products.state.error" @click="openTechCardForm()"><Plus class="size-4" />Техкарта</Button>
        </div>
        <p v-if="techCards.state.loading" class="text-sm text-muted-foreground" role="status">Загрузка техкарт…</p>
        <p v-else-if="techCards.state.error" class="text-sm text-destructive" role="alert">{{ techCards.state.error }}</p>
        <DataTable v-else :columns="techCardColumns" :rows="visibleTechCards" :empty-text="techCardSearch.trim() ? 'Совпадений не найдено' : 'Техкарт пока нет'">
          <template #cell-productionCost="{ row }">{{ money(row.cost) }} сом</template>
          <template #cell-salePrice="{ row }">{{ money(row.price) }} сом</template>
          <template #cell-actions="{ row }">
            <div class="flex justify-end gap-1">
              <Button size="icon" variant="ghost" :aria-label="`Информация о техкарте ${row.name}`" @click="openTechCardInfo(row)"><Info class="size-4 text-sky-600" /></Button>
              <Button size="icon" variant="ghost" :aria-label="`Изменить техкарту ${row.name}`" @click="openTechCardForm(row)"><Pencil class="size-4 text-blue-600" /></Button>
              <Button size="icon" variant="ghost" :aria-label="`Удалить техкарту ${row.name}`" @click="openTechCardDelete(row)"><Trash2 class="size-4 text-destructive" /></Button>
            </div>
          </template>
        </DataTable>
      </TabsContent>

      <TabsContent value="receipts" class="space-y-4">
        <div class="flex flex-wrap items-end gap-3">
          <Input v-model="receiptSearch" class="w-full max-w-xs" type="search" placeholder="Поиск товара" aria-label="Поиск товара" />
          <label class="grid gap-1 text-sm">Склад<select v-model="receiptWarehouseId" aria-label="Склад поступления" class="h-10 min-w-44 rounded-md border bg-background px-3 disabled:opacity-60" :disabled="selectionLocked || state.loading || !!state.error || !state.rows.length"><option value="" disabled>{{ state.loading ? 'Загрузка складов…' : state.rows.length ? 'Выберите склад' : 'Создайте склад во вкладке «Склады»' }}</option><option v-for="warehouse in state.rows" :key="warehouse.id" :value="warehouse.id">{{ warehouse.name }}</option></select></label>
          <label class="grid gap-1 text-sm"><span class="flex items-center justify-between gap-3">Счёт<span v-if="receiptAccount" class="text-xs text-muted-foreground">{{ money(receiptAccount.amount) }} сом</span></span><select v-model="receiptAccountId" aria-label="Счёт поступления" class="h-10 min-w-44 rounded-md border bg-background px-3 disabled:opacity-60" :disabled="selectionLocked || !accounts.length"><option value="" disabled>{{ accounts.length ? 'Выберите счёт' : 'Создайте счёт во вкладке «Счёт»' }}</option><option v-for="account in accounts" :key="account.id" :value="account.id">{{ account.name }}</option></select></label>
        </div>
        <p v-if="receiptLoadError" class="text-sm text-destructive" role="alert">{{ receiptLoadError }}</p>
        <p v-if="products.state.loading" class="text-sm text-muted-foreground" role="status">Загрузка товаров…</p>
        <p v-else-if="products.state.error" class="text-sm text-destructive" role="alert">{{ products.state.error }}</p>
        <DataTable v-else :columns="receiptColumns" :rows="visibleReceiptProducts" :empty-text="receiptSearch.trim() ? 'Совпадений не найдено' : 'Сначала добавьте товары'">
          <template #cell-product="{ row }">
            <span>{{ row.name }}</span>
            <small class="block text-muted-foreground">{{ row.unit }}<template v-if="row.quantityPerPiece"> · {{ row.quantityPerPiece }} {{ row.contentUnit }} в 1 {{ row.unit }}</template></small>
            <p v-if="receiptFeedback(row.id)" class="mt-1 whitespace-normal text-xs text-destructive" role="alert">{{ receiptFeedback(row.id) }}</p>
          </template>
          <template #cell-quantity="{ row }"><Input type="number" min="0.001" step="0.001" placeholder="0" :disabled="receiptBusy[row.id] || receiptSeconds(row.id) === 0" :model-value="receiptDrafts[row.id]?.quantity ?? ''" :aria-label="`Количество ${row.name}`" @update:model-value="updateReceiptDraft(row.id, 'quantity', String($event))" /></template>
          <template #cell-unitPrice="{ row }">
            <div class="flex min-w-32 items-center gap-2">
              <Input type="number" min="0" step="0.01" placeholder="0,00" :disabled="receiptBusy[row.id] || receiptSeconds(row.id) === 0" :model-value="receiptDrafts[row.id]?.unitPrice ?? ''" :aria-label="`Цена закупки ${row.name} за ${receiptProduct(row).unit}`" @update:model-value="updateReceiptDraft(row.id, 'unitPrice', String($event))" />
              <span class="text-xs text-muted-foreground">сом/{{ receiptProduct(row).unit }}</span>
            </div>
          </template>
          <template #cell-salePrice="{ row }">
            <div class="flex min-w-32 items-center gap-2">
              <Input type="number" min="0" max="1000000" step="0.01" placeholder="—" :disabled="receiptBusy[row.id] || receiptSeconds(row.id) === 0" :model-value="salePriceFor(row)" :aria-label="`Цена продажи ${row.name} за ${receiptProduct(row).contentUnit ?? receiptProduct(row).unit}`" @update:model-value="updateReceiptDraft(row.id, 'salePrice', String($event))" />
              <span class="text-xs text-muted-foreground">сом/{{ receiptProduct(row).contentUnit ?? receiptProduct(row).unit }}</span>
            </div>
          </template>
          <template #cell-sum="{ row }">{{ receiptTotal(row.id) === null ? '—' : `${money(receiptTotal(row.id)!)} сом` }}</template>
          <template #cell-revenue="{ row }">{{ expectedRevenue(row) }}</template>
          <template #cell-actions="{ row }">
            <div class="flex items-center justify-end gap-2">
              <input type="checkbox" class="size-4 accent-primary" :checked="latest[row.id]?.status === 'pending'" :disabled="receiptBusy[row.id] || receiptSeconds(row.id) === 0" :aria-label="`Поступление: ${row.name}`" @click.prevent="toggleReceipt(row.id, latest[row.id]?.status !== 'pending')">
              <span class="flex size-9 items-center justify-center rounded-full border text-xs tabular-nums" :class="receiptSeconds(row.id) === null ? 'text-muted-foreground' : 'border-primary text-primary'" role="timer" aria-label="Секунд до поступления">{{ receiptSeconds(row.id) ?? 120 }}</span>
            </div>
          </template>
        </DataTable>
      </TabsContent>
    </Tabs>
    <ProductFormDialog v-model:open="productDialogOpen" :product="selectedProduct" :saving="products.state.pending" :error="products.state.error" @save="saveProduct" />
    <DeleteProductDialog v-model:open="productDeleteOpen" :name="deletingProduct?.name || ''" :pending="products.state.pending" :error="products.state.error" @confirm="confirmDeleteProduct" />
    <WarehouseFormDialog v-model:open="dialogOpen" :warehouse="editing" :saving="formStore.pending.value" :error="formStore.error.value" @save="save" />
    <DeleteWarehouseDialog v-model:open="deleteOpen" :name="deleting?.name || ''" :pending="remove.pending.value" :error="remove.error.value" @confirm="confirmDelete" />
    <TechCardFormDialog v-model:open="techCardDialogOpen" :card="selectedTechCard" :products="products.state.rows" :saving="techCards.state.pending" :error="techCards.state.error" @save="saveTechCard" />
    <TechCardInfoDialog v-model:open="techCardInfoOpen" :card="infoTechCard" />
    <DeleteTechCardDialog v-model:open="deleteTechCardOpen" :name="deletingTechCard?.name || ''" :pending="techCards.state.pending" :error="techCards.state.error" @confirm="confirmDeleteTechCard" />
  </section>
</template>
