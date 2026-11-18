import type { DeleteTransferInput, DeleteTransferResult } from './types'

export function deleteTransfer({ id }: DeleteTransferInput) {
  return $fetch<DeleteTransferResult>(`/api/accounts/transfers/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
