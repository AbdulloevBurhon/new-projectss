import type { UpdateTransferInput, UpdatedTransfer } from './types'

export function updateTransfer({ id, ...draft }: UpdateTransferInput) {
  return $fetch<UpdatedTransfer>(`/api/accounts/transfers/${encodeURIComponent(id)}`, {
    method: 'PATCH', body: draft,
  })
}
