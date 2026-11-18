import type { CreatedExpense, ExpenseDraft } from './types'

export function createExpense(draft: ExpenseDraft) {
  return $fetch<CreatedExpense>('/api/accounts/expenses', { method: 'POST', body: draft })
}
