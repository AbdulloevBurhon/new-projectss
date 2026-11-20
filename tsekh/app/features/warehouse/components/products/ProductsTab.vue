<script setup lang="ts">
import { computed, ref } from 'vue'
import { Button,DataTable,Input,Tabs,TabsList,TabsTrigger,TabsContent,toast } from '@obshaya/ui'
import { Archive,Plus,Pencil,Trash2 } from '@lucide/vue'
import { barcodeMaxLength, type Product, type ProductDraft } from '../../../../../endpoints/warehouse/products/products.types'
import ProductFormDialog from './ProductFormDialog.vue'
import ProductBulkEntry from './ProductBulkEntry.vue'
import DeleteProductDialog from './DeleteProductDialog.vue'
import { useWarehouseContext } from '../../composables/warehouseContext'
const { products } = useWarehouseContext()
const productDialogOpen = ref(false)
const selectedProduct = ref<Product | null>(null)
const productDeleteOpen = ref(false)
const deletingProduct = ref<Product | null>(null)
const productSearch = ref('')
const productView = ref('mass')
const visibleProducts = computed(() => products.state.rows.filter(product =>
  product.name.toLocaleLowerCase('ru').includes(productSearch.value.trim().toLocaleLowerCase('ru')),
))
const productColumns = [
  { key: 'name', label: 'Название' },
  { key: 'barcode', label: 'Штрих' },
  { key: 'unit', label: 'Ед. изм.' },
  { key: 'actions', label: 'Действия', align: 'right' as const },
]
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

async function saveMassProduct(draft: ProductDraft, id?: string) {
  if (!await products.save(draft, id)) return null
  const saved = products.state.rows.find(product => product.id === id) ?? products.state.rows[0]
  if (saved) toast.success(id ? 'Товар изменён.' : 'Товар добавлен.')
  return saved ?? null
}

async function confirmDeleteProduct() {
  if (!deletingProduct.value || !await products.remove(deletingProduct.value.id)) return
  productDeleteOpen.value = false
  toast.success('Товар удалён.')
}
</script>

<template>
  <TabsContent value="products" force-mount class="space-y-4 data-[state=inactive]:hidden">
    <Tabs v-model:model-value="productView" class="space-y-4">
      <div class="flex flex-wrap items-center gap-3">
        <TabsList class="h-auto w-fit rounded-xl bg-muted p-1">
          <TabsTrigger value="mass" class="h-9 rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"><Plus class="size-4 text-blue-600" />Массово</TabsTrigger>
          <TabsTrigger value="list" class="h-9 rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"><Archive class="size-4 text-blue-600" />Товары</TabsTrigger>
        </TabsList>
        <Input v-if="productView === 'list'" v-model="productSearch" class="max-w-xs" type="search" placeholder="Поиск по названию" aria-label="Поиск товара" />
        <Button v-if="productView === 'list'" class="ml-auto" :disabled="products.state.loading || !!products.state.error" @click="openProductForm()"><Plus class="size-4" />Товар</Button>
      </div>
      <p v-if="products.state.loading" class="text-sm text-muted-foreground" role="status">Загрузка товаров…</p>
      <p v-else-if="products.state.error && productView === 'list'" class="text-sm text-destructive" role="alert">{{ products.state.error }}</p>
      <TabsContent value="mass" force-mount class="data-[state=inactive]:hidden">
        <ProductBulkEntry v-show="!products.state.loading" :save="saveMassProduct" :error="products.state.error" />
      </TabsContent>
      <TabsContent value="list">
        <DataTable v-if="!products.state.loading && !products.state.error" :columns="productColumns" :rows="visibleProducts" :empty-text="productSearch.trim() ? 'Совпадений не найдено' : 'Товаров пока нет'">
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
    </Tabs>
  </TabsContent>
    <ProductFormDialog v-model:open="productDialogOpen" :product="selectedProduct" :saving="products.state.pending" :error="products.state.error" @save="saveProduct" />
    <DeleteProductDialog v-model:open="productDeleteOpen" :name="deletingProduct?.name || ''" :pending="products.state.pending" :error="products.state.error" @confirm="confirmDeleteProduct" />
</template>
