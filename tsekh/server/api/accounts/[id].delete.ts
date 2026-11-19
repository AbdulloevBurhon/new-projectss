import { deleteAccount } from '../../services/accounts/accounts.service'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Не указан счёт.' })
  try {
    if (!deleteAccount(id)) throw createError({ statusCode: 404, statusMessage: 'Счёт не найден.' })
    return { success: true }
  } catch (error) {
    if (String(error).includes('STOCK_RECEIPT_PENDING')) {
      throw createError({ statusCode: 409, data: { message: 'Нельзя удалить счёт, пока ожидается поступление.' } })
    }
    if (String(error).includes('FOREIGN KEY')) {
      throw createError({ statusCode: 409, statusMessage: 'Нельзя удалить счёт, пока к нему привязаны операции.' })
    }
    throw error
  }
})
