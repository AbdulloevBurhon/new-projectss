import { deleteExpense } from '../../../services/expenses/expenses.service'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Не указано списание.' })
  if (!deleteExpense(id)) throw createError({ statusCode: 404, statusMessage: 'Списание не найдено.' })
  return { success: true }
})
