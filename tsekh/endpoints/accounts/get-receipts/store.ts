import { getReceipts } from './service'
import type { ReceiptFilters, ReceiptRecord } from './types'

export async function loadReceipts(filters: ReceiptFilters = {}) {
  const rows = await getReceipts(filters)
  useState<ReceiptRecord[]>('account-receipts', () => []).value = rows
  return rows
}
