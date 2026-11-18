import { getExpenses } from './service'
import type { ExpenseFilters, ExpenseRecord } from './types'

export async function loadExpenses(filters: ExpenseFilters = {}) {
  const rows = await getExpenses(filters)
  useState<ExpenseRecord[]>('account-expenses', () => []).value = rows
  return rows
}
