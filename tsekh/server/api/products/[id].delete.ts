import { deleteProduct } from '../../services/products/products.service'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Не указан товар.' })
  if (!deleteProduct(id)) throw createError({ statusCode: 404, statusMessage: 'Товар не найден.' })
  return { success: true }
})
