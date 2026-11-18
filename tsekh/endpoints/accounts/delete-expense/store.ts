import { deleteExpense } from './service'
import type { DeleteExpenseInput } from './types'
import type { ExpenseRecord } from '../get-expenses/types'
import { loadAccounts } from '../get-accounts/store'

export async function removeExpense(input: DeleteExpenseInput) {
  await deleteExpense(input)
  const rows = useState<ExpenseRecord[]>('account-expenses', () => [])
  rows.value = rows.value.filter(row => row.id !== input.id)
  try { await loadAccounts() } catch { /* Expense was already committed. */ }
}
