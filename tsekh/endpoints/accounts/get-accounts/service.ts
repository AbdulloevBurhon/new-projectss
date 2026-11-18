import type { AccountRecord } from './types'

export function getAccounts() {
  return $fetch<AccountRecord[]>('/api/accounts')
}
