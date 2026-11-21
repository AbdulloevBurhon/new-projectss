import { ref } from 'vue'
import { saveStockExpiry, type StockExpiryRow } from '../../../../../endpoints/warehouse/stock-receipts/expiry'
import { stockReceiptError } from '../../../../../endpoints/warehouse/stock-receipts/service'

export function useExpiryEditor(apply: (receipt: string, value: string | null) => void) {
  const draft = ref<{ row: StockExpiryRow; date: string }>()
  const saving = ref(false)
  const editError = ref('')

  function start(row: StockExpiryRow) {
    if (saving.value || !row.receiptId || !row.lot) return
    draft.value = { row, date: row.expiresOn ?? '' }
    editError.value = ''
  }
  function cancel() {
    if (saving.value) return
    draft.value = undefined
    editError.value = ''
  }
  async function save() {
    const edit = draft.value
    if (saving.value || !edit?.row.receiptId || !edit.row.lot) return
    const expiresOn = edit.date || null
    if (expiresOn === edit.row.expiresOn) { cancel(); return }
    saving.value = true
    editError.value = ''
    try {
      const result = await saveStockExpiry(edit.row.receiptId, edit.row.lot, expiresOn, edit.row.expiresOn)
      apply(edit.row.receiptId, result.expiresOn)
      draft.value = undefined
    } catch (error) {
      editError.value = stockReceiptError(error, 'Не удалось сохранить срок годности.')
    } finally {
      saving.value = false
    }
  }
  return { draft, saving, editError, start, cancel, save }
}
