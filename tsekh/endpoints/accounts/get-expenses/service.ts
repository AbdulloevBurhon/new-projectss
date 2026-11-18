import type { ExpenseFilters, ExpenseRecord } from './types'

export function getExpenses(filters: ExpenseFilters = {}) {
  return $fetch<ExpenseRecord[]>('/api/accounts/expenses', { query: filters })
}
