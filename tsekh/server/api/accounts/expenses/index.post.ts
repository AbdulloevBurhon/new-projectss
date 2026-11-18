import { createExpense, type ExpenseDraft, validateExpenseDraft } from '../../../services/expenses/expenses.service'

export default defineEventHandler(async (event) => {
  const draft = await readBody<ExpenseDraft>(event)
  validateExpenseDraft(draft)
  return createExpense(draft)
})
