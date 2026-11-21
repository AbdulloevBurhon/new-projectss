<script setup lang="ts">
import { computed, ref } from 'vue'
import { DataTable,Input,TabsContent } from '@obshaya/ui'
import { barcodeMaxLength, type Product, type ProductDraft } from '../../../../../endpoints/warehouse/products/products.types'
import { stockReceiptDelaySeconds } from '../../../../../endpoints/warehouse/stock-receipts/types'
import { money } from '../../format'
import { useWarehouseContext } from '../../composables/warehouseContext'
import { useEmployeeAccess } from '../../../workers/composables/useEmployeeAccess'
import BarcodeScanner from '../../../../components/barcode/BarcodeScanner.vue'
import { useReceiptProductSearch } from '../../composables/receipts/useReceiptProductSearch'
import { receiptColumns } from './receiptColumns'
const { activeTab,state,products,accounts,receiptWarehouseId,receiptAccountId,latest,receiptDrafts,receiptErrors,receiptBusy,receiptLoadError,receiptSeconds,updateReceiptDraft,toggleReceipt,salePriceFor,selectionLocked } = useWarehouseContext()
const { can } = useEmployeeAccess()
const scanner = ref<InstanceType<typeof BarcodeScanner>>()
const { receiptSearch, receiptBarcodeSearch, visibleReceiptProducts, hasFilters, scan } = useReceiptProductSearch(() => products.state.rows)
const receiptAccount = computed(() => accounts.value.find(account => account.id === receiptAccountId.value) ?? null)
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

function receiptLocked(id: string, action: 'edit' | 'delete') {
  return receiptBusy[id] || receiptSeconds(id) === 0
    || (latest.value[id]?.status === 'pending' && !can(`warehouses.${action}`))
}

function saveReceiptBarcode(id: string, event: Event) {
  if (!can('warehouses.edit')) return
  const input = event.target as HTMLInputElement
  const barcode = input.value.trim()
  input.value = barcode
  void products.saveBarcode(id, barcode || null)
}
</script>

<template>
  <TabsContent value="receipts" class="space-y-4">
    <div class="flex flex-wrap items-end gap-3">
      <Input v-model="receiptSearch" class="w-full max-w-xs" type="search" placeholder="Поиск товара" aria-label="Поиск товара" />
      <Input v-model="receiptBarcodeSearch" class="w-full max-w-52" type="search" placeholder="Поиск по штриху" aria-label="Поиск по штриху" autocomplete="off" spellcheck="false"
        @keydown.enter="!$event.isComposing && !$event.repeat && scanner?.submit(($event.target as HTMLInputElement).value)" />
      <label class="grid gap-1 text-sm">Склад<select v-model="receiptWarehouseId" aria-label="Склад поступления" class="h-10 min-w-44 rounded-md border bg-background px-3 disabled:opacity-60" :disabled="selectionLocked || state.loading || !!state.error || !state.rows.length"><option value="" disabled>{{ state.loading ? 'Загрузка складов…' : state.rows.length ? 'Выберите склад' : 'Создайте склад во вкладке «Склады»' }}</option><option v-for="warehouse in state.rows" :key="warehouse.id" :value="warehouse.id">{{ warehouse.name }}</option></select></label>
      <label class="grid gap-1 text-sm"><span class="flex items-center justify-between gap-3">Счёт<span v-if="receiptAccount" class="text-xs text-muted-foreground">{{ money(receiptAccount.amount) }} сом</span></span><select v-model="receiptAccountId" aria-label="Счёт поступления" class="h-10 min-w-44 rounded-md border bg-background px-3 disabled:opacity-60" :disabled="selectionLocked || !accounts.length"><option value="" disabled>{{ accounts.length ? 'Выберите счёт' : 'Создайте счёт во вкладке «Счёт»' }}</option><option v-for="account in accounts" :key="account.id" :value="account.id">{{ account.name }}</option></select></label>
    </div>
    <BarcodeScanner ref="scanner" :disabled="activeTab !== 'receipts' || products.state.loading || !!products.state.error" :scan="scan" />
    <p v-if="receiptLoadError" class="text-sm text-destructive" role="alert">{{ receiptLoadError }}</p>
    <p v-if="products.state.loading" class="text-sm text-muted-foreground" role="status">Загрузка товаров…</p>
    <p v-else-if="products.state.error" class="text-sm text-destructive" role="alert">{{ products.state.error }}</p>
    <DataTable v-else :columns="receiptColumns" :rows="visibleReceiptProducts" :empty-text="hasFilters ? 'Совпадений не найдено' : 'Сначала добавьте товары'">
      <template #cell-product="{ row }">
        <span>{{ row.name }}</span>
        <small class="block text-muted-foreground">{{ row.unit }}<template v-if="row.quantityPerPiece"> · {{ row.quantityPerPiece }} {{ row.contentUnit }} в 1 {{ row.unit }}</template></small>
        <p v-if="receiptFeedback(row.id)" class="mt-1 whitespace-normal text-xs text-destructive" role="alert">{{ receiptFeedback(row.id) }}</p>
      </template>
      <template #cell-barcode="{ row }">
        <Input class="min-w-28" :model-value="row.barcode ?? ''" :maxlength="barcodeMaxLength" inputmode="numeric" autocomplete="off" spellcheck="false"
          :aria-label="`Штрих товара ${row.name}`" :aria-invalid="!!products.barcodeErrors[row.id]" :disabled="!can('warehouses.edit') || products.barcodePending[row.id]"
          @blur="saveReceiptBarcode(row.id, $event)" @keydown.enter.prevent="saveReceiptBarcode(row.id, $event)" />
        <p v-if="products.barcodeErrors[row.id]" class="mt-1 whitespace-normal text-xs text-destructive" role="alert">{{ products.barcodeErrors[row.id] }}</p>
      </template>
      <template #cell-quantity="{ row }"><Input type="number" min="0.001" step="0.001" placeholder="0" :disabled="receiptLocked(row.id, 'edit')" :model-value="receiptDrafts[row.id]?.quantity ?? ''" :aria-label="`Количество ${row.name}`" @update:model-value="updateReceiptDraft(row.id, 'quantity', String($event))" /></template>
      <template #cell-unitPrice="{ row }">
        <div class="flex min-w-32 items-center gap-2">
          <Input type="number" min="0" step="0.01" placeholder="0,00" :disabled="receiptLocked(row.id, 'edit')" :model-value="receiptDrafts[row.id]?.unitPrice ?? ''" :aria-label="`Цена закупки ${row.name} за ${receiptProduct(row).unit}`" @update:model-value="updateReceiptDraft(row.id, 'unitPrice', String($event))" />
          <span class="text-xs text-muted-foreground">сом/{{ receiptProduct(row).unit }}</span>
        </div>
      </template>
      <template #cell-salePrice="{ row }">
        <div class="flex min-w-32 items-center gap-2">
          <Input type="number" min="0" max="1000000" step="0.01" placeholder="—" :disabled="receiptLocked(row.id, 'edit')" :model-value="salePriceFor(row)" :aria-label="`Цена продажи ${row.name} за ${receiptProduct(row).contentUnit ?? receiptProduct(row).unit}`" @update:model-value="updateReceiptDraft(row.id, 'salePrice', String($event))" />
          <span class="text-xs text-muted-foreground">сом/{{ receiptProduct(row).contentUnit ?? receiptProduct(row).unit }}</span>
        </div>
      </template>
      <template #cell-expiry="{ row }">
        <Input type="date" class="min-w-36 px-2" max="9999-12-31" :disabled="receiptLocked(row.id, 'edit')"
          :model-value="receiptDrafts[row.id]?.expiresOn ?? ''" :aria-label="`Срок годности ${row.name} (необязательно)`"
          @update:model-value="updateReceiptDraft(row.id, 'expiresOn', String($event))" />
      </template>
      <template #cell-sum="{ row }">{{ receiptTotal(row.id) === null ? '—' : `${money(receiptTotal(row.id)!)} сом` }}</template>
      <template #cell-revenue="{ row }">{{ expectedRevenue(row) }}</template>
      <template #cell-actions="{ row }">
        <div class="flex items-center justify-end gap-2">
          <input type="checkbox" class="size-4 accent-primary" :checked="latest[row.id]?.status === 'pending'" :disabled="receiptLocked(row.id, 'delete')" :aria-label="`Поступление: ${row.name}`" @click.prevent="toggleReceipt(row.id, latest[row.id]?.status !== 'pending')">
          <span class="flex size-9 items-center justify-center rounded-full border text-xs tabular-nums" :class="receiptSeconds(row.id) === null ? 'text-muted-foreground' : 'border-primary text-primary'" role="timer" aria-label="Секунд до поступления">{{ receiptSeconds(row.id) ?? stockReceiptDelaySeconds }}</span>
        </div>
      </template>
    </DataTable>
  </TabsContent>
</template>
