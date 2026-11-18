import type { TransferRecord } from '../get-transfers/types'

export interface TransferDraft {
  date: string; sourceAccountId: string; targetAccountId: string; amount: number; note: string
}
export type CreatedTransfer = TransferRecord
