import type { CreatedTransfer, TransferDraft } from './types'

export function createTransfer(draft: TransferDraft) {
  return $fetch<CreatedTransfer>('/api/accounts/transfers', { method: 'POST', body: draft })
}
