import type { DeleteExpenseInput, DeleteExpenseResult } from './types'

export function deleteExpense({ id }: DeleteExpenseInput) {
  return $fetch<DeleteExpenseResult>(`/api/accounts/expenses/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
