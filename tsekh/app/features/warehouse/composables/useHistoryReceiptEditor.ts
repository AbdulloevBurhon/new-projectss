import { computed, ref } from 'vue'
import { stockReceiptError } from '../../../../endpoints/warehouse/stock-receipts/service'
import type { StockReceipt } from '../../../../endpoints/warehouse/stock-receipts/types'
import { useWarehouseContext } from './warehouseContext'
import { money } from '../format'

export function useHistoryReceiptEditor() {
  const { accounts, changePostedReceipt } = useWarehouseContext()
  const draft = ref<{ id: string; accountId: string; quantity: string | number; unitPrice: string | number; salePrice: string | number } | null>(null)
  const selectedAccount = computed(() => accounts.value.find(account => account.id === draft.value?.accountId))
  const deleteTarget = ref<StockReceipt | null>(null)
  const busy = ref(false)
  const editError = ref('')
  const deleteError = ref('')
  const deleteOpen = computed({
    get: () => deleteTarget.value !== null,
    set: open => { if (!open && !busy.value) deleteTarget.value = null },
  })

  function startEdit(row: StockReceipt) {
    draft.value = {
      id: row.id,
      accountId: row.accountId,
      quantity: String(row.quantity ?? ''),
      unitPrice: String(row.unitPrice ?? ''),
      salePrice: String(row.salePrice ?? ''),
    }
    editError.value = ''
  }

  function resetEdit() {
    draft.value = null
    editError.value = ''
  }

  function askToDelete(row: StockReceipt) {
    deleteError.value = ''
    deleteTarget.value = row
  }

  function readAmount(value: string | number) {
    if (!String(value).trim()) return null
    const amount = Number(value)
    return Number.isFinite(amount) && amount >= 0 && amount <= 1_000_000 ? amount : null
  }

  function amountText(amount: number | null | undefined) {
    return amount == null ? '—' : `${money(amount)} сом`
  }

  function priceText(price: number | null | undefined, unit: string) {
    return price == null ? '—' : `${money(price)} сом/${unit}`
  }

  function rowTotal(row: StockReceipt, price: 'unitPrice' | 'salePrice') {
    const currentDraft = draft.value?.id === row.id ? draft.value : null
    if (price === 'unitPrice' && !currentDraft) return row.total
    const qty = currentDraft ? readAmount(currentDraft.quantity) : row.quantity
    const unitPrice = currentDraft ? readAmount(currentDraft[price]) : row[price]
    if (qty === null || qty < 0.001 || unitPrice === null) return null
    const factor = price === 'salePrice' ? row.quantityPerPiece ?? 1 : 1
    return Math.round((qty * unitPrice * factor + Number.EPSILON) * 100) / 100
  }

  async function saveEdit(row: StockReceipt) {
    if (busy.value || draft.value?.id !== row.id) return
    const { accountId } = draft.value
    if (!accountId) {
      editError.value = 'Выберите счёт.'
      return
    }
    const quantity = readAmount(draft.value.quantity)
    const unitPrice = readAmount(draft.value.unitPrice)
    const salePrice = readAmount(draft.value.salePrice)
    if (quantity === null || quantity < 0.001 || unitPrice === null || (String(draft.value.salePrice).trim() && salePrice === null)) {
      editError.value = 'Проверьте количество и цены.'
      return
    }
    busy.value = true
    editError.value = ''
    try {
      await changePostedReceipt(row, { accountId, quantity, unitPrice, salePrice })
      resetEdit()
    } catch (error) {
      editError.value = stockReceiptError(error, 'Не удалось сохранить поступление.')
    } finally {
      busy.value = false
    }
  }

  async function confirmDelete() {
    const row = deleteTarget.value
    if (!row || busy.value) return
    busy.value = true
    deleteError.value = ''
    try {
      await changePostedReceipt(row)
      deleteTarget.value = null
      if (draft.value?.id === row.id) resetEdit()
    } catch (error) {
      deleteError.value = stockReceiptError(error, 'Не удалось удалить поступление.')
    } finally {
      busy.value = false
    }
  }

  return { draft, selectedAccount, deleteTarget, busy, editError, deleteError, deleteOpen,
    startEdit, resetEdit, askToDelete, amountText, priceText, rowTotal, saveEdit, confirmDelete }
}
