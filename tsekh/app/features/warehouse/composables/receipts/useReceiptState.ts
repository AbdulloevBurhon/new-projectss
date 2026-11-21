import { computed, onBeforeUnmount, onMounted, reactive, ref, watch, type Ref } from 'vue'
import { discardStockReceipt, loadStockReceipts, startStockReceipt, stockReceiptError, updateStockReceipt } from '../../../../../endpoints/warehouse/stock-receipts/service'
import type { StockReceipt, StockReceiptAmounts } from '../../../../../endpoints/warehouse/stock-receipts/types'
import type { Product } from '../../../../../endpoints/warehouse/products/products.types'
export interface ReceiptLine {
  quantity: string
  unitPrice: string
  salePrice: string
  expiresOn: string
}
export function useReceiptState(warehouseId:Ref<string>,accountId:Ref<string>,products:()=>Product[]) {
  const rows = ref<StockReceipt[]>([])
  const lines = reactive<Record<string, ReceiptLine>>({})
  const errors = reactive<Record<string, string>>({})
  const busy = reactive<Record<string, boolean>>({})
  const loadError = ref('')
  const now = ref(Date.now())
  const saving = new Map<string, Promise<void>>()

  const posted = computed(() => rows.value.filter(row => row.status === 'posted'))
  const pendingReceipt = computed(() => rows.value.find(row => row.status === 'pending'))
  const selectionLocked = computed(() => !!pendingReceipt.value || Object.values(busy).some(Boolean))
  watch(pendingReceipt, (row) => {
    if (row) {
      warehouseId.value = row.warehouseId
      accountId.value = row.accountId
    }
  })
  const salePrices = computed(() => {
    const prices = new Map<string, string>()
    for (const row of posted.value) {
      const key = JSON.stringify([row.productId, row.contentUnit ?? row.unit])
      if (row.salePrice != null && !prices.has(key)) prices.set(key, String(row.salePrice))
    }
    return prices
  })
  const latest = computed(() => {
    const byProduct: Record<string, StockReceipt> = {}
    for (const row of rows.value) {
      if (!byProduct[row.productId] || row.status === 'pending') byProduct[row.productId] = row
    }
    return byProduct
  })

  function fields(row: StockReceipt): ReceiptLine {
    return {
      quantity: row.quantity === null ? '' : String(row.quantity),
      unitPrice: row.unitPrice === null ? '' : String(row.unitPrice),
      salePrice: row.salePrice == null ? '' : String(row.salePrice),
      expiresOn: row.expiresOn ?? '',
    }
  }

  function salePriceFor(product: Product) {
    return lines[product.id]?.salePrice ?? salePrices.value.get(JSON.stringify([product.id, product.contentUnit ?? product.unit])) ?? ''
  }

  function newLine(id: string): ReceiptLine {
    const product = products().find(row => row.id === id)
    return { quantity: '', unitPrice: '', salePrice: product ? salePriceFor(product) : '', expiresOn: '' }
  }

  function payload(id: string): StockReceiptAmounts {
    const line = lines[id]
    return {
      quantity: line.quantity.trim() ? Number(line.quantity) : null,
      unitPrice: line.unitPrice.trim() ? Number(line.unitPrice) : null,
      salePrice: line.salePrice.trim() ? Number(line.salePrice) : null,
      expiresOn: line.expiresOn || null,
    }
  }

  function seconds(id: string) {
    const row = latest.value[id]
    return row?.status === 'pending' ? Math.ceil(Math.max(0, row.dueAt - now.value) / 1000) : null
  }

return {rows,lines,errors,busy,loadError,now,saving,posted,selectionLocked,latest,fields,salePriceFor,newLine,payload,seconds, revision:ref(0),nextPoll:ref(0)}
}
