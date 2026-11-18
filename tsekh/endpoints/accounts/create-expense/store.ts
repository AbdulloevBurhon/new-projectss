import { createExpense } from './service'
import type { ExpenseDraft } from './types'
import type { ExpenseRecord } from '../get-expenses/types'
import { loadAccounts } from '../get-accounts/store'

export async function saveExpense(draft: ExpenseDraft) {
  const expense = await createExpense(draft)
  const rows = useState<ExpenseRecord[]>('account-expenses', () => [])
  rows.value = [expense, ...rows.value.filter(row => row.id !== expense.id)]
  try { await loadAccounts() } catch { /* Expense was already committed. */ }
  return expense
}
