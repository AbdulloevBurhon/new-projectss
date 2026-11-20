import { computed, onBeforeUnmount, onMounted, reactive, ref, watch, type Ref } from 'vue'
import { discardStockReceipt, loadStockReceipts, startStockReceipt, stockReceiptError, updateStockReceipt } from '../../../../../endpoints/warehouse/stock-receipts/service'
import type { StockReceipt, StockReceiptAmounts } from '../../../../../endpoints/warehouse/stock-receipts/types'
import type { Product } from '../../../../../endpoints/warehouse/products/products.types'
import { useReceiptState,type ReceiptLine } from './useReceiptState'
import { useReceiptPolling } from './useReceiptPolling'
export function useStockReceipts(warehouseId: Ref<string>, accountId: Ref<string>, products: () => Product[], refreshAccounts: () => Promise<unknown>) {
const state=useReceiptState(warehouseId,accountId,products)
useReceiptPolling(state,refreshAccounts)
const {rows,lines,errors,busy,loadError,saving,posted,latest,fields,salePriceFor,newLine,payload,seconds,revision,nextPoll,selectionLocked}=state
  function edit(id: string, field: keyof ReceiptLine, value: string) {
    const row = latest.value[id]
    if (busy[id] || seconds(id) === 0) return
    lines[id] ??= newLine(id)
    lines[id][field] = value
    delete errors[id]
    if (row?.status !== 'pending') return

    revision.value++
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
    revision.value++
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
      nextPoll.value = 0
    }
  }
  return { posted, latest, lines, errors, busy, loadError, seconds, edit, toggle, salePriceFor, selectionLocked }
}
