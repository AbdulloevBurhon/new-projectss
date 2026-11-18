import type { UpdateReceiptInput, UpdatedReceipt } from './types'

export function updateReceipt({ id, ...draft }: UpdateReceiptInput) {
  return $fetch<UpdatedReceipt>(`/api/accounts/receipts/${encodeURIComponent(id)}`, {
    method: 'PATCH', body: draft,
  })
}
