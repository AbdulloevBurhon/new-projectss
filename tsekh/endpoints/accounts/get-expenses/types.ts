export interface ExpenseRecord {
  id: string
  date: string
  accountId: string
  accountName: string
  amount: number
  note: string
  createdAt: string
}

export interface ExpenseFilters { from?: string; to?: string }
