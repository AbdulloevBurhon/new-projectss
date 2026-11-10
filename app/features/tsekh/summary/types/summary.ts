import type { AccountMovement } from '~/features/tsekh/accounts/types/accounts'
import type { Receipt } from '~/features/tsekh/warehouse/types/inventory'
import type { Worker } from '~/features/tsekh/workers/types/workers'

export interface SummarySources {
  workers: Worker[]
  movements: AccountMovement[]
  receipts: Receipt[]
}

export interface SummaryPeriod {
  from: string
  to: string
}
