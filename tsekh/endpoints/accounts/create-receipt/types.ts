import type { ReceiptRecord } from '../get-receipts/types'

export interface ReceiptDraft { date: string; accountId: string; amount: number; note: string }
export type CreatedReceipt = ReceiptRecord
