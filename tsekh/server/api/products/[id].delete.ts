import { deleteProduct } from '../../services/products/products.service'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Не указан товар.' })
  try {
    if (!deleteProduct(id)) throw createError({ statusCode: 404, statusMessage: 'Товар не найден.' })
  } catch (error) {
    if (String(error).includes('STOCK_RECEIPT_PENDING')) {
      throw createError({ statusCode: 409, data: { message: 'Нельзя удалить товар, пока ожидается поступление.' } })
    }
    throw error
  }
  return { success: true }
})
