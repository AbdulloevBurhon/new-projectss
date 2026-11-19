import { computed, onBeforeUnmount, onMounted, reactive, ref, watch, type Ref } from 'vue'
import { discardStockReceipt, loadStockReceipts, startStockReceipt, stockReceiptError, updateStockReceipt } from '../../../../endpoints/warehouse/stock-receipts/service'
import type { StockReceipt, StockReceiptAmounts } from '../../../../endpoints/warehouse/stock-receipts/types'
import type { Product } from '../../../../endpoints/warehouse/products/products.types'

interface ReceiptLine {
  quantity: string
  unitPrice: string
  salePrice: string
}

export function useStockReceipts(warehouseId: Ref<string>, accountId: Ref<string>, products: () => Product[], refreshAccounts: () => Promise<unknown>) {
  const rows = ref<StockReceipt[]>([])
  const lines = reactive<Record<string, ReceiptLine>>({})
  const errors = reactive<Record<string, string>>({})
  const busy = reactive<Record<string, boolean>>({})
  const loadError = ref('')
  const now = ref(Date.now())
  let serverOffset = 0
  let loaded = false
  let interval: ReturnType<typeof setInterval> | undefined
  let nextPoll = 0
  let refreshing = false
  let revision = 0
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
    }
  }

  function salePriceFor(product: Product) {
    return lines[product.id]?.salePrice ?? salePrices.value.get(JSON.stringify([product.id, product.contentUnit ?? product.unit])) ?? ''
  }

  function newLine(id: string): ReceiptLine {
    const product = products().find(row => row.id === id)
    return { quantity: '', unitPrice: '', salePrice: product ? salePriceFor(product) : '' }
  }

  async function reload() {
    if (refreshing) return
    refreshing = true
    const requestedRevision = revision
    try {
      const result = await loadStockReceipts()
      if (requestedRevision !== revision || saving.size || Object.values(busy).some(Boolean)) return
      serverOffset = result.serverTime - Date.now()
      now.value = Date.now() + serverOffset
      const previous = latest.value
      const postedCount = posted.value.length
      rows.value = result.rows
      for (const row of Object.values(latest.value)) {
        if (row.status === 'posted') {
          if (previous[row.productId]?.status === 'pending') {
            delete lines[row.productId]
            delete errors[row.productId]
          }
        } else if (previous[row.productId]?.id !== row.id || !lines[row.productId]) {
          lines[row.productId] = fields(row)
        }
      }
      if (loaded && posted.value.length !== postedCount) {
        try { await refreshAccounts() } catch { loadError.value = 'Не удалось обновить остаток счёта.'; return }
      }
      loaded = true
      loadError.value = ''
    } catch {
      loadError.value = 'Не удалось загрузить поступления.'
    } finally {
      refreshing = false
    }
  }

  function payload(id: string): StockReceiptAmounts {
    const line = lines[id]
    return {
      quantity: line.quantity.trim() ? Number(line.quantity) : null,
      unitPrice: line.unitPrice.trim() ? Number(line.unitPrice) : null,
      salePrice: line.salePrice.trim() ? Number(line.salePrice) : null,
    }
  }

  function seconds(id: string) {
    const row = latest.value[id]
    return row?.status === 'pending' ? Math.ceil(Math.max(0, row.dueAt - now.value) / 1000) : null
  }

  function edit(id: string, field: keyof ReceiptLine, value: string) {
    const row = latest.value[id]
    if (busy[id] || seconds(id) === 0) return
    lines[id] ??= newLine(id)
    lines[id][field] = value
    delete errors[id]
    if (row?.status !== 'pending') return

    revision++
    const existing = saving.get(id)
    const operation: Promise<void> = (async () => {
      await existing
      if (saving.get(id) !== operation) return
      try {
        await updateStockReceipt(row.id, payload(id))
        delete errors[id]
      } catch (error) {
        errors[id] = stockReceiptError(error, 'Не удалось сохранить изменения поступления.')
      }
    })()
    saving.set(id, operation)
    void operation.finally(() => {
      if (saving.get(id) === operation) saving.delete(id)
    })
  }

  async function toggle(id: string, checked: boolean) {
    if (busy[id]) return
    const row = latest.value[id]
    const selection = { warehouseId: warehouseId.value, accountId: accountId.value }
    busy[id] = true
    revision++
    delete errors[id]
    try {
      await saving.get(id)
      if (checked) {
        lines[id] ??= newLine(id)
        const draft = { ...selection, ...payload(id) }
        if (!draft.warehouseId || !draft.accountId) throw new Error('Выберите склад и счёт.')
        if (draft.quantity === null || draft.unitPrice === null) throw new Error('Укажите количество и цену закупки.')
        const created = await startStockReceipt(crypto.randomUUID(), id, draft)
        rows.value = [created, ...rows.value]
        lines[id] = fields(created)
      } else if (row?.status === 'pending') {
        await discardStockReceipt(row.id)
        rows.value = rows.value.filter(entry => entry.id !== row.id)
      }
    } catch (error) {
      errors[id] = stockReceiptError(error, error instanceof Error && !('data' in error) ? error.message : 'Не удалось изменить поступление.')
    } finally {
      delete busy[id]
      nextPoll = 0
    }
  }

  onMounted(() => {
    void reload()
    interval = setInterval(() => {
      now.value = Date.now() + serverOffset
      if (Date.now() < nextPoll) return
      const pending = rows.value.some(row => row.status === 'pending')
      nextPoll = Date.now() + (pending ? 750 : 5000)
      void reload()
    }, 250)
  })
  onBeforeUnmount(() => clearInterval(interval))

  return { posted, latest, lines, errors, busy, loadError, seconds, edit, toggle, salePriceFor, selectionLocked }
}
