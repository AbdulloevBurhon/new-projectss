export interface ReceiptRecord {
  id: string
  date: string
  accountId: string
  accountName: string
  amount: number
  note: string
  createdAt: string
}

export interface ReceiptFilters { from?: string; to?: string }
