import { barcodeMaxLength, normalizeBarcode, productUnits, type Product, type ProductDraft, type ProductUnit } from './products.types'
import { getTechCards } from '../techcards/techcards.service'

export const productsKey = 'obshaya:data:tsekh:products'

function isUnit(value: unknown): value is ProductUnit {
  return typeof value === 'string' && productUnits.some(unit => unit === value)
}

function isProduct(value: unknown): value is Product {
  if (!value || typeof value !== 'object') return false
  const product = value as Record<string, unknown>
  if (typeof product.id !== 'string' || typeof product.name !== 'string' || !isUnit(product.unit)) return false
  if (product.barcode != null && (typeof product.barcode !== 'string' || product.barcode.trim().length > barcodeMaxLength)) return false
  if (product.quantityPerPiece === undefined) return product.contentUnit === undefined || isUnit(product.contentUnit)
  return (product.unit === 'шт' || product.unit === 'кг' || product.unit === 'уп')
    && isUnit(product.contentUnit)
    && typeof product.quantityPerPiece === 'number'
    && Number.isFinite(product.quantityPerPiece)
    && product.quantityPerPiece > 0
}

export function getLegacyProducts(): Product[] {
  const raw = localStorage.getItem(productsKey)
  if (raw === null) return []
  const rows: unknown = JSON.parse(raw)
  if (!Array.isArray(rows) || !rows.every(isProduct)) throw new Error('Не удалось прочитать сохранённые товары.')
  return rows as Product[]
}

export function validateProductDraft(draft: ProductDraft): Omit<Product, 'id'> {
  const name = draft.name.trim()
  if (!name || name.length > 100) throw new Error('Введите название до 100 символов.')
  if (!isUnit(draft.unit)) throw new Error('Выберите единицу измерения.')
  if (draft.packaged && ((draft.unit !== 'шт' && draft.unit !== 'кг' && draft.unit !== 'уп') || !isUnit(draft.contentUnit))) {
    throw new Error('Для учёта содержимого выберите единицу «шт», «кг» или «уп» и единицу содержимого.')
  }

  const barcode = normalizeBarcode(draft.barcode)
  if (!draft.packaged) return { name, barcode, unit: draft.unit }
  const quantity = Number(draft.quantityPerPiece)
  const validQuantity = Number.isFinite(quantity) && quantity > 0 && quantity <= 1_000_000
    && Math.abs(quantity * 1000 - Math.round(quantity * 1000)) < 0.000001
  if (!validQuantity) throw new Error(`Введите количество в 1 ${draft.unit} (до 3 знаков после запятой).`)
  return { name, barcode, unit: draft.unit, contentUnit: draft.contentUnit, quantityPerPiece: quantity }
}

export function getProducts() {
  return $fetch<Product[]>('/api/products')
}

export function saveProducts(rows: Product[]) {
  const value = JSON.stringify(rows)
  if (localStorage.getItem(productsKey) !== value) localStorage.setItem(productsKey, value)
}

export function saveProduct(draft: ProductDraft, id?: string, previous?: Product) {
  const fields = validateProductDraft(draft)
  const referenced = id ? getTechCards().some(card => card.materials.some(line => line.productId === id)) : false
  if (referenced && previous && (previous.unit !== fields.unit || previous.contentUnit !== fields.contentUnit || previous.quantityPerPiece !== fields.quantityPerPiece)) {
    throw new Error('Товар используется в техкарте. Сначала уберите его из состава, затем изменяйте единицы или упаковку.')
  }
  return id
    ? $fetch<Product>(`/api/products/${encodeURIComponent(id)}`, { method: 'PATCH', body: fields })
    : $fetch<Product>('/api/products', { method: 'POST', body: fields })
}

export function deleteProduct(id: string) {
  if (getTechCards().some(card => card.materials.some(line => line.productId === id))) throw new Error('Товар используется в техкарте. Сначала уберите его из состава.')
  return $fetch<{ success: boolean }>(`/api/products/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function saveProductBarcode(id: string, barcode: string | null) {
  return $fetch<Product>(`/api/products/${encodeURIComponent(id)}`, { method: 'PATCH', body: { barcode } })
}
