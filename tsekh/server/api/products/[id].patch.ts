import { updateProduct, validateProductDraft } from '../../services/products/products.service'
import type { Product } from '../../../endpoints/warehouse/products/products.types'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Не указан товар.' })
  let fields: Omit<Product, 'id'>
  try { fields = validateProductDraft(await readBody(event)) }
  catch (error) { throw createError({ statusCode: 400, statusMessage: error instanceof Error ? error.message : 'Проверьте данные товара.' }) }
  const product = updateProduct(id, fields)
  if (!product) throw createError({ statusCode: 404, statusMessage: 'Товар не найден.' })
  return product
})
