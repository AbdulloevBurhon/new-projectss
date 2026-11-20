import { duplicateBarcodeCode, updateProduct, updateProductBarcode, validateProductDraft } from '../../services/products/products.service'
import { normalizeBarcode, type Product } from '../../../endpoints/warehouse/products/products.types'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Не указан товар.' })
  const body = await readBody(event)
  const barcodeOnly = body && typeof body === 'object' && Object.keys(body).length === 1 && Object.hasOwn(body, 'barcode')
  let fields: Omit<Product, 'id'> | undefined
  let barcode: string | null = null
  try {
    if (barcodeOnly) barcode = normalizeBarcode(body.barcode) ?? null
    else fields = validateProductDraft(body)
  }
  catch (error) { throw createError({ statusCode: 400, statusMessage: error instanceof Error ? error.message : 'Проверьте данные товара.' }) }
  let product: Product | undefined
  try { product = fields ? updateProduct(id, fields) : updateProductBarcode(id, barcode) }
  catch (error) {
    if (error instanceof Error && error.message === duplicateBarcodeCode) throw createError({ statusCode: 409, statusMessage: 'Товар с таким штрихкодом уже существует.' })
    throw error
  }
  if (!product) throw createError({ statusCode: 404, statusMessage: 'Товар не найден.' })
  return product
})
