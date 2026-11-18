import { getTransfers } from './service'
import type { TransferFilters, TransferRecord } from './types'

export async function loadTransfers(filters: TransferFilters = {}) {
  const rows = await getTransfers(filters)
  useState<TransferRecord[]>('account-transfers', () => []).value = rows
  return rows
}
