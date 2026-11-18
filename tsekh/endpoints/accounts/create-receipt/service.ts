import type { CreatedReceipt, ReceiptDraft } from './types'

export function createReceipt(draft: ReceiptDraft) {
  return $fetch<CreatedReceipt>('/api/accounts/receipts', { method: 'POST', body: draft })
}
