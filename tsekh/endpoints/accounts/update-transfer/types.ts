import type { TransferRecord } from '../get-transfers/types'
import type { TransferDraft } from '../create-transfer/types'

export interface UpdateTransferInput extends TransferDraft { id: string }
export type UpdatedTransfer = TransferRecord
