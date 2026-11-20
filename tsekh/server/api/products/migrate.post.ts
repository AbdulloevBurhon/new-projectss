import { migrateProducts } from '../../services/products/products.service'
import { barcodeMaxLength, productUnits, type Product } from '../../../endpoints/warehouse/products/products.types'

export default defineEventHandler(async (event) => {
  const rows = (await readBody<{ products?: unknown }>(event))?.products
  if (!Array.isArray(rows) || rows.length > 5000 || rows.some(row => !validProduct(row))) {
    throw createError({ statusCode: 400, statusMessage: 'Некорректные сохранённые товары.' })
  }
  try { return { migrated: migrateProducts(rows) } }
  catch (error) {
    if (String(error).includes('UNIQUE')) throw createError({ statusCode: 409, statusMessage: 'В сохранённых товарах есть повторяющиеся идентификаторы.' })
    throw error
  }
})

function validProduct(value: unknown): value is Product {
  if (!value || typeof value !== 'object') return false
  const row = value as Partial<Product>
  if (typeof row.id !== 'string' || !row.id || row.id.length > 100 || typeof row.name !== 'string'
      || !row.name.trim() || row.name.trim().length > 100 || !productUnits.includes(row.unit as Product['unit'])) return false
  if (row.contentUnit !== undefined && !productUnits.includes(row.contentUnit)) return false
  if (row.barcode != null && (typeof row.barcode !== 'string' || row.barcode.trim().length > barcodeMaxLength)) return false
  if (row.quantityPerPiece === undefined) return true
  return ['шт', 'кг', 'уп'].includes(row.unit!) && !!row.contentUnit
    && Number.isFinite(row.quantityPerPiece) && row.quantityPerPiece > 0 && row.quantityPerPiece <= 1_000_000
}
