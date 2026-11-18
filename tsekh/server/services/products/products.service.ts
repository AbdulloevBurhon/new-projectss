import { randomUUID } from 'node:crypto'
import database from '../../database/products/products.database'
import { productUnits, type Product, type ProductDraft, type ProductUnit } from '../../../endpoints/warehouse/products/products.types'

const list = database.prepare('SELECT id,name,unit,content_unit AS contentUnit,quantity_per_piece AS quantityPerPiece FROM products ORDER BY created_at DESC,rowid DESC')
const find = database.prepare('SELECT id,name,unit,content_unit AS contentUnit,quantity_per_piece AS quantityPerPiece FROM products WHERE id=?')
const insert = database.prepare('INSERT INTO products (id,name,unit,content_unit,quantity_per_piece) VALUES (@id,@name,@unit,@contentUnit,@quantityPerPiece)')
const update = database.prepare('UPDATE products SET name=@name,unit=@unit,content_unit=@contentUnit,quantity_per_piece=@quantityPerPiece,updated_at=CURRENT_TIMESTAMP WHERE id=@id')
const remove = database.prepare('DELETE FROM products WHERE id=?')
const count = database.prepare('SELECT COUNT(*) AS total FROM products')
const importRow = database.prepare('INSERT INTO products (id,name,unit,content_unit,quantity_per_piece) VALUES (@id,@name,@unit,@contentUnit,@quantityPerPiece)')

function record(row: unknown): Product {
  const value = row as Product & { contentUnit: ProductUnit | null; quantityPerPiece: number | null }
  return {
    id: value.id, name: value.name, unit: value.unit,
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
  const hasContent = draft.contentUnit !== undefined || draft.quantityPerPiece !== undefined
  if (!hasContent) return { name, unit: draft.unit }
  if (!['шт', 'кг', 'уп'].includes(draft.unit) || !validUnit(draft.contentUnit)) throw new Error('Проверьте единицу и содержимое упаковки.')
  const quantity = Number(draft.quantityPerPiece)
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 1_000_000 || Math.abs(quantity * 1000 - Math.round(quantity * 1000)) >= 0.000001) {
    throw new Error('Введите количество в упаковке до 3 знаков после запятой.')
  }
  return { name, unit: draft.unit, contentUnit: draft.contentUnit, quantityPerPiece: quantity }
}

export function getProducts(): Product[] { return (list.all() as Product[]).map(record) }
export function createProduct(fields: Omit<Product, 'id'>): Product {
  const id = randomUUID()
  insert.run({ id, name: fields.name, unit: fields.unit, contentUnit: fields.contentUnit ?? null, quantityPerPiece: fields.quantityPerPiece ?? null })
  return record(find.get(id))
}
export function updateProduct(id: string, fields: Omit<Product, 'id'>): Product | undefined {
  if (!update.run({ id, name: fields.name, unit: fields.unit, contentUnit: fields.contentUnit ?? null, quantityPerPiece: fields.quantityPerPiece ?? null }).changes) return undefined
  return record(find.get(id))
}
export function deleteProduct(id: string) { return remove.run(id).changes > 0 }

export function migrateProducts(rows: Product[]) {
  if ((count.get() as { total: number }).total) return false
  database.transaction((items: Product[]) => items.forEach(row => importRow.run({
    id: row.id, name: row.name, unit: row.unit, contentUnit: row.contentUnit ?? null, quantityPerPiece: row.quantityPerPiece ?? null,
  })))(rows)
  return true
}
