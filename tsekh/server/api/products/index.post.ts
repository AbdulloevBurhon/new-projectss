import { createProduct, validateProductDraft } from '../../services/products/products.service'
import type { Product } from '../../../endpoints/warehouse/products/products.types'

export default defineEventHandler(async (event) => {
  let fields: Omit<Product, 'id'>
  try { fields = validateProductDraft(await readBody(event)) }
  catch (error) { throw createError({ statusCode: 400, statusMessage: error instanceof Error ? error.message : 'Проверьте данные товара.' }) }
  return createProduct(fields)
})
