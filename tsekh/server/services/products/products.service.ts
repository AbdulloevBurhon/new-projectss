import { randomUUID } from 'node:crypto'
import database from '../../database/products/products.database'
import { normalizeBarcode, productUnits, type Product, type ProductDraft, type ProductUnit } from '../../../endpoints/warehouse/products/products.types'

const projection = 'SELECT id,name,unit,content_unit AS contentUnit,quantity_per_piece AS quantityPerPiece,barcode FROM products'
const list = database.prepare(`${projection} ORDER BY created_at DESC,rowid DESC`)
const find = database.prepare(`${projection} WHERE id=?`)
const insert = database.prepare('INSERT INTO products (id,name,unit,content_unit,quantity_per_piece,barcode) VALUES (@id,@name,@unit,@contentUnit,@quantityPerPiece,@barcode)')
const update = database.prepare(`UPDATE products SET name=@name,unit=@unit,content_unit=@contentUnit,quantity_per_piece=@quantityPerPiece,
  barcode=CASE WHEN @hasBarcode THEN @barcode ELSE barcode END,updated_at=CURRENT_TIMESTAMP WHERE id=@id`)
const remove = database.prepare('DELETE FROM products WHERE id=?')
const updateBarcode = database.prepare('UPDATE products SET barcode=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
const count = database.prepare('SELECT COUNT(*) AS total FROM products')
const findBarcode = database.prepare('SELECT id FROM products WHERE barcode=? COLLATE NOCASE AND id<>? LIMIT 1')
export const duplicateBarcodeCode = 'PRODUCT_BARCODE_ALREADY_EXISTS'

function ensureBarcodeAvailable(barcode: string | null | undefined, id: string) {
  if (barcode && findBarcode.get(barcode, id)) throw new Error(duplicateBarcodeCode)
}

function record(row: unknown): Product {
  const value = row as Product & { contentUnit: ProductUnit | null; quantityPerPiece: number | null }
  return {
    id: value.id, name: value.name, unit: value.unit,
    ...(value.barcode ? { barcode: value.barcode } : {}),
    ...(value.contentUnit ? { contentUnit: value.contentUnit } : {}),
    ...(value.quantityPerPiece !== null ? { quantityPerPiece: value.quantityPerPiece } : {}),
  }
}
function validUnit(value: unknown): value is ProductUnit { return typeof value === 'string' && productUnits.includes(value as ProductUnit) }

export function validateProductDraft(value: unknown): Omit<Product, 'id'> {
  const draft = value as Partial<ProductDraft> | null
  if (!draft) throw new Error('Проверьте данные товара.')
  const name = typeof draft?.name === 'string' ? draft.name.trim() : ''
  if (!name || name.length > 100) throw new Error('Введите название до 100 символов.')
  if (!validUnit(draft?.unit)) throw new Error('Выберите единицу измерения.')
  const barcode = normalizeBarcode(draft.barcode)
  const hasContent = draft.contentUnit !== undefined || draft.quantityPerPiece !== undefined
  if (!hasContent) return { name, barcode, unit: draft.unit }
  if (!['шт', 'кг', 'уп'].includes(draft.unit) || !validUnit(draft.contentUnit)) throw new Error('Проверьте единицу и содержимое упаковки.')
  const quantity = Number(draft.quantityPerPiece)
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 1_000_000 || Math.abs(quantity * 1000 - Math.round(quantity * 1000)) >= 0.000001) {
    throw new Error('Введите количество в упаковке до 3 знаков после запятой.')
  }
  return { name, barcode, unit: draft.unit, contentUnit: draft.contentUnit, quantityPerPiece: quantity }
}

export function getProducts(): Product[] { return (list.all() as Product[]).map(record) }
export function createProduct(fields: Omit<Product, 'id'>): Product {
  const id = randomUUID()
  database.transaction(() => {
    ensureBarcodeAvailable(fields.barcode, id)
    insert.run({ id, name: fields.name, unit: fields.unit, barcode: fields.barcode ?? null, contentUnit: fields.contentUnit ?? null, quantityPerPiece: fields.quantityPerPiece ?? null })
  }).immediate()
  return record(find.get(id))
}
export function updateProduct(id: string, fields: Omit<Product, 'id'>): Product | undefined {
  const changes = database.transaction(() => {
    ensureBarcodeAvailable(fields.barcode, id)
    return update.run({ id, name: fields.name, unit: fields.unit, barcode: fields.barcode ?? null, hasBarcode: Number(fields.barcode !== undefined),
      contentUnit: fields.contentUnit ?? null, quantityPerPiece: fields.quantityPerPiece ?? null }).changes
  }).immediate()
  if (!changes) return undefined
  return record(find.get(id))
}
export function deleteProduct(id: string) { return remove.run(id).changes > 0 }

export function updateProductBarcode(id: string, barcode: string | null): Product | undefined {
  const changes = database.transaction(() => {
    ensureBarcodeAvailable(barcode, id)
    return updateBarcode.run(barcode, id).changes
  }).immediate()
  if (!changes) return undefined
  return record(find.get(id))
}

export function migrateProducts(rows: Product[]) {
  if ((count.get() as { total: number }).total) return false
  database.transaction((items: Product[]) => items.forEach(row => insert.run({
    id: row.id, name: row.name, unit: row.unit, barcode: normalizeBarcode(row.barcode) ?? null,
    contentUnit: row.contentUnit ?? null, quantityPerPiece: row.quantityPerPiece ?? null,
  })))(rows)
  return true
}
