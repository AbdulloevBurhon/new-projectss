import type { AccountDetails } from './types'

export function getAccountDetails(id: string, signal?: AbortSignal) {
  return $fetch<AccountDetails>(`/api/accounts/${encodeURIComponent(id)}`, { signal })
}
