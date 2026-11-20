import { createProduct, duplicateBarcodeCode, validateProductDraft } from '../../services/products/products.service'
import type { Product } from '../../../endpoints/warehouse/products/products.types'

export default defineEventHandler(async (event) => {
  let fields: Omit<Product, 'id'>
  try { fields = validateProductDraft(await readBody(event)) }
  catch (error) { throw createError({ statusCode: 400, statusMessage: error instanceof Error ? error.message : 'Проверьте данные товара.' }) }
  try { return createProduct(fields) }
  catch (error) {
    if (error instanceof Error && error.message === duplicateBarcodeCode) throw createError({ statusCode: 409, statusMessage: 'Товар с таким штрихкодом уже существует.' })
    throw error
  }
})
