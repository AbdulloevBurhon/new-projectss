import { deleteWarehouse } from '../../services/warehouses/warehouses.service'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Не указан склад.' })
  try {
    if (!deleteWarehouse(id)) throw createError({ statusCode: 404, statusMessage: 'Склад не найден.' })
  } catch (error) {
    if (String(error).includes('STOCK_RECEIPT_PENDING')) {
      throw createError({ statusCode: 409, data: { message: 'Нельзя удалить склад, пока ожидается поступление.' } })
    }
    throw error
  }
  return { success: true }
})
