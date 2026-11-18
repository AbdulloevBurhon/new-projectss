import type { DeleteAccountInput, DeleteAccountResult } from './types'

export function deleteAccount({ id }: DeleteAccountInput) {
  return $fetch<DeleteAccountResult>(`/api/accounts/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
