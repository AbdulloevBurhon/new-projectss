import type { TransferFilters, TransferRecord } from './types'

export function getTransfers(filters: TransferFilters = {}) {
  return $fetch<TransferRecord[]>('/api/accounts/transfers', { query: filters })
}
