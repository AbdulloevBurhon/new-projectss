import type { ExpenseRecord } from '../get-expenses/types'

export interface ExpenseDraft { date: string; accountId: string; amount: number; note: string }
export type CreatedExpense = ExpenseRecord
