import type { StockReceipt, StockReceiptAmounts, StockReceiptDraft, StockReceiptsResult } from './types'

const path = '/api/stock-receipts'

export const loadStockReceipts = () => $fetch<StockReceiptsResult>(path)

export function startStockReceipt(id: string, productId: string, draft: StockReceiptDraft) {
  return $fetch<StockReceipt>(path, { method: 'POST', body: { id, productId, ...draft } })
}

export function updateStockReceipt(id: string, draft: StockReceiptAmounts) {
  return $fetch<StockReceipt>(`${path}/${encodeURIComponent(id)}`, { method: 'PATCH', body: draft })
}

export function discardStockReceipt(id: string) {
  return $fetch(`${path}/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function stockReceiptError(error: unknown, fallback: string) {
  const response = error as { data?: { data?: { message?: string }; statusMessage?: string } } | null
  return response?.data?.data?.message || response?.data?.statusMessage || fallback
}
