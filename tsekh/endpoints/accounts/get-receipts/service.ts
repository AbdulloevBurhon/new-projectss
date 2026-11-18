import type { ReceiptFilters, ReceiptRecord } from './types'

export function getReceipts(filters: ReceiptFilters = {}) {
  return $fetch<ReceiptRecord[]>('/api/accounts/receipts', { query: filters })
}
