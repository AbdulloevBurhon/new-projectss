import type { ReceiptRecord } from '../get-receipts/types'
import type { ReceiptDraft } from '../create-receipt/types'

export interface UpdateReceiptInput extends ReceiptDraft { id: string }
export type UpdatedReceipt = ReceiptRecord
