import { updateExpense, type ExpenseDraft, validateExpenseDraft } from '../../../services/expenses/expenses.service'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const draft = await readBody<ExpenseDraft>(event)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Не указано списание.' })
  validateExpenseDraft(draft)
  const expense = updateExpense(id, draft)
  if (!expense) throw createError({ statusCode: 404, statusMessage: 'Списание не найдено.' })
  return expense
})
