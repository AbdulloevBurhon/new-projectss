import { accountsStorageKey, readLedger } from '~/features/tsekh/accounts/services/accounts-storage'
import { readInventory, storageKey } from '~/features/tsekh/warehouse/services/inventory-storage'
import { readWorkers, workersStorageKey } from '~/features/tsekh/workers/services/workers-storage'
import type { SummarySources } from '../types/summary'

const sourceKeys = new Set([accountsStorageKey, storageKey, workersStorageKey])

export function summarySourceChanged(key: string | null) {
  return key === null || sourceKeys.has(key)
}

export function readSummarySources(): SummarySources {
  return {
    workers: readWorkers(),
    movements: readLedger().movements,
    receipts: readInventory().receipts,
  }
}
