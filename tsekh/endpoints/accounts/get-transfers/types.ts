export interface TransferRecord {
  id: string
  date: string
  sourceAccountId: string
  sourceAccountName: string
  targetAccountId: string
  targetAccountName: string
  amount: number
  note: string
  createdAt: string
}

export interface TransferFilters { from?: string; to?: string }
