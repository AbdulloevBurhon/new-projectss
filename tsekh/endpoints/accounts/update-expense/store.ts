import { updateExpense } from './service'
import type { UpdateExpenseInput } from './types'
import type { ExpenseRecord } from '../get-expenses/types'
import { loadAccounts } from '../get-accounts/store'

export async function saveExpenseChanges(input: UpdateExpenseInput) {
  const expense = await updateExpense(input)
  const rows = useState<ExpenseRecord[]>('account-expenses', () => [])
  rows.value = rows.value.map(row => row.id === expense.id ? expense : row)
  try { await loadAccounts() } catch { /* Expense was already committed. */ }
  return expense
}
