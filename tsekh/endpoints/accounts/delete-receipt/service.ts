import type { DeleteReceiptInput, DeleteReceiptResult } from './types'

export function deleteReceipt({ id }: DeleteReceiptInput) {
  return $fetch<DeleteReceiptResult>(`/api/accounts/receipts/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
