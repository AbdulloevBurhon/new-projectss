import type { Ledger } from '~/features/tsekh/accounts/types/accounts'
import type { Client } from '~/features/tsekh/clients/types/clients'
import type { Inventory } from '~/features/tsekh/warehouse/types/inventory'
import type { Worker } from '~/features/tsekh/workers/types/workers'

export interface Archive {
  format: 'workshop-04'
  version: 1
  createdAt: string
  inventory: Inventory
  workers: Worker[]
  ledger: Ledger
  clients: Client[]
}

export interface BackupSchedule {
  days: number[]
  time: string
  enabledAt: number
}

export interface BackupStatus {
  slot: number
  createdAt: string
  destination: 'folder' | 'browser'
}
