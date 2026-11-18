import type { ExpenseRecord } from '../get-expenses/types'
import type { ExpenseDraft } from '../create-expense/types'

export interface UpdateExpenseInput extends ExpenseDraft { id: string }
export type UpdatedExpense = ExpenseRecord
