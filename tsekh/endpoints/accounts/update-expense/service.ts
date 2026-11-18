import type { UpdateExpenseInput, UpdatedExpense } from './types'

export function updateExpense({ id, ...draft }: UpdateExpenseInput) {
  return $fetch<UpdatedExpense>(`/api/accounts/expenses/${encodeURIComponent(id)}`, {
    method: 'PATCH', body: draft,
  })
}
