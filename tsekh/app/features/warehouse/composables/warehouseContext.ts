import { computed, inject, provide, ref, onMounted, onBeforeUnmount, type InjectionKey } from 'vue'
import { toast } from '@obshaya/ui'
import { warehousesKey } from '../../../../endpoints/warehouse/get-warehouses/get-warehouses.service'
import { useGetWarehousesStore } from '../../../../endpoints/warehouse/get-warehouses/get-warehouses.store'
import { productsKey } from '../../../../endpoints/warehouse/products/products.service'
import { useProductsStore } from '../../../../endpoints/warehouse/products/products.store'
import { techCardsKey } from '../../../../endpoints/warehouse/techcards/techcards.service'
import { useTechCardsStore } from '../../../../endpoints/warehouse/techcards/techcards.store'
import { accountsKey, getAccounts, type AccountRecord } from '../../../../endpoints/accounts/accounts.service'
import { loadAccounts as fetchAccounts } from '../../../../endpoints/accounts/get-accounts/store'
import { useStockReceipts } from './receipts/useStockReceipts'
function createContext() {
  const { state, load } = useGetWarehousesStore()
  const products = useProductsStore()
  const techCards = useTechCardsStore()
  const receiptWarehouseId = ref('')
  const receiptAccountId = ref('')
  const accounts = useState('accounts', () => [] as AccountRecord[])
  const nuxt = useNuxtApp()
  const refreshAccounts = () => nuxt.runWithContext(fetchAccounts)
  const {
    posted, latest, lines: receiptDrafts, errors: receiptErrors, busy: receiptBusy, loadError: receiptLoadError,
    seconds: receiptSeconds, edit: updateReceiptDraft, toggle: toggleReceipt, salePriceFor, selectionLocked,
  } = useStockReceipts(receiptWarehouseId, receiptAccountId, () => products.state.rows, refreshAccounts)
  const activeTab = ref('warehouses')
  const warehouseNames = computed(() => {
    const names = new Map(state.rows.map(row => [row.id, row.name]))
    for (const row of posted.value) {
      if (!names.has(row.warehouseId)) names.set(row.warehouseId, row.warehouseName)
    }
    return names
  })
  const listedWarehouses = computed(() => [...warehouseNames.value].map(([id, name]) => ({ id, name })))
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
  return {
    activeTab, state, load, products, techCards, accounts, receiptWarehouseId, receiptAccountId,
    posted, latest, receiptDrafts, receiptErrors, receiptBusy, receiptLoadError, receiptSeconds,
    updateReceiptDraft, toggleReceipt, salePriceFor, selectionLocked, warehouseNames, listedWarehouses,
  }
}
const key: InjectionKey<ReturnType<typeof createContext>> = Symbol('warehouse')
export function provideWarehouseContext() {
  const context = createContext()
  provide(key, context)
  return context
}

export function useWarehouseContext() {
  const context = inject(key)
  if (!context) throw new Error('Warehouse context missing')
  return context
}
