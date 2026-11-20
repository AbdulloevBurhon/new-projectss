<script setup lang="ts">
import { Check, Clock3, Pencil } from '@lucide/vue'
import { Button, DataTable, Input } from '@obshaya/ui'
import type { Product, ProductDraft } from '../../../../../endpoints/warehouse/products/products.types'
import ProductUnitSelect from './ProductUnitSelect.vue'
import { useBulkProducts } from '../../composables/products/useBulkProducts'
const props = defineProps<{ save: (draft: ProductDraft, id?: string) => Promise<Product | null>; error?: string }>()
const { rows,visibleRows,pageSizeOptions,resizeRows,changed,quantitySummary,acceptRow,editRow } = useBulkProducts(props)
const columns = [
  { key: 'name', label: 'Название', class: 'min-w-44' }, { key: 'barcode', label: 'Штрих', class: 'min-w-36' },
  { key: 'unit', label: 'Ед. изм.', class: 'min-w-28' }, { key: 'contentUnit', label: 'Ед. содержимого', class: 'min-w-36' },
  { key: 'quantityPerPiece', label: 'Кол-во содержимого', class: 'min-w-56' }, { key: 'actions', label: 'Действия', align: 'right' as const, class: 'min-w-40' },
]
</script>

<template>
  <div class="space-y-3">
    <p class="text-sm text-muted-foreground">Нажмите ✓, чтобы сохранить товар через 20 секунд. Карандаш отменяет отсчёт и открывает строку для редактирования.</p>
    <p v-if="error && !rows.some(row => row.error)" class="text-sm text-destructive" role="alert">{{ error }}</p>
    <div class="overflow-x-auto">
      <DataTable :columns="columns" :rows="visibleRows" :page-size-options="pageSizeOptions" empty-text="Нет строк для заполнения" @update:page-size="resizeRows">
        <template #cell-name="{ row }">
          <Input v-model="row.name" :disabled="row.mode !== 'editing' || row.queued" maxlength="100" placeholder="Название" @update:model-value="changed(row)" />
          <p v-if="row.error" class="mt-1 text-xs text-destructive" role="alert">{{ row.error }}</p>
        </template>
        <template #cell-barcode="{ row }">
          <Input v-model="row.barcode" :disabled="row.mode !== 'editing' || row.queued" maxlength="128" autocomplete="off" placeholder="Штрихкод" @update:model-value="changed(row)" />
        </template>
        <template #cell-unit="{ row }">
          <ProductUnitSelect :id="`mass-product-unit-${row.id}`" v-model="row.unit" :disabled="row.mode !== 'editing' || row.queued" @update:model-value="changed(row)" />
        </template>
        <template #cell-contentUnit="{ row }">
          <ProductUnitSelect :id="`mass-product-content-unit-${row.id}`" v-model="row.contentUnit" :disabled="row.mode !== 'editing' || row.queued" @update:model-value="changed(row)" />
        </template>
        <template #cell-quantityPerPiece="{ row }">
          <div class="flex min-w-0 items-center gap-2">
            <Input v-model="row.quantityPerPiece" class="min-w-24 flex-1" :disabled="row.mode !== 'editing' || row.queued" type="number" min="0.001" max="1000000" step="0.001" placeholder="Необязательно" @update:model-value="changed(row)" />
            <span class="shrink-0 whitespace-nowrap text-xs text-muted-foreground">{{ quantitySummary(row) }}</span>
          </div>
        </template>
        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-2">
            <span v-if="row.mode === 'saved'" class="text-sm text-emerald-700">Сохранено</span>
            <span v-else-if="row.mode === 'countdown'" class="inline-flex items-center gap-1 text-xs text-muted-foreground" aria-live="polite"><Clock3 class="size-3.5" />{{ row.seconds }} с</span>
            <Button size="icon" variant="ghost" :disabled="row.queued || (row.mode === 'editing' && !row.name.trim())" :aria-label="row.mode === 'editing' ? `Принять товар ${row.name || ''}` : `Редактировать товар ${row.name}`" @click="row.mode === 'editing' ? acceptRow(row) : editRow(row)">
              <Check v-if="row.mode === 'editing'" class="size-4 text-emerald-600" />
              <Pencil v-else class="size-4 text-blue-600" />
            </Button>
          </div>
        </template>
      </DataTable>
    </div>
  </div>
</template>
