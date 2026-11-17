import { productUnits, type Product, type ProductDraft, type ProductUnit } from './products.types'
import { getTechCards } from '../techcards/techcards.service'

export const productsKey = 'obshaya:data:tsekh:products'

function isUnit(value: unknown): value is ProductUnit {
  return typeof value === 'string' && productUnits.some(unit => unit === value)
}

function isProduct(value: unknown): value is Product {
  if (!value || typeof value !== 'object') return false
  const product = value as Record<string, unknown>
  if (typeof product.id !== 'string' || typeof product.name !== 'string' || !isUnit(product.unit)) return false
  if (product.quantityPerPiece === undefined) return product.contentUnit === undefined || isUnit(product.contentUnit)
  return (product.unit === 'шт' || product.unit === 'кг' || product.unit === 'уп')
    && isUnit(product.contentUnit)
    && typeof product.quantityPerPiece === 'number'
    && Number.isFinite(product.quantityPerPiece)
    && product.quantityPerPiece > 0
}

export function getProducts() {
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

  if (!draft.packaged) return { name, unit: draft.unit }
  const quantity = Number(draft.quantityPerPiece)
  const validQuantity = Number.isFinite(quantity) && quantity > 0 && quantity <= 1_000_000
    && Math.abs(quantity * 1000 - Math.round(quantity * 1000)) < 0.000001
  if (!validQuantity) throw new Error(`Введите количество в 1 ${draft.unit} (до 3 знаков после запятой).`)
  return { name, unit: draft.unit, contentUnit: draft.contentUnit, quantityPerPiece: quantity }
}

async function changeProducts(change: (rows: Product[]) => Product[]) {
  const save = () => {
    const rows = change(getProducts())
    try {
      localStorage.setItem(productsKey, JSON.stringify(rows))
    } catch {
      throw new Error('Не удалось сохранить товары в браузере.')
    }
    return rows
  }
  return navigator.locks ? navigator.locks.request(productsKey, save) : save()
}

export function saveProduct(draft: ProductDraft, id?: string) {
  const fields = validateProductDraft(draft)
  return changeProducts((rows) => {
    const previous = id ? rows.find(product => product.id === id) : undefined
    if (id && !previous) throw new Error('Товар уже удалён.')
    const referenced = id ? getTechCards().some(card => card.materials.some(line => line.productId === id)) : false
    if (referenced && previous && (previous.unit !== fields.unit || previous.contentUnit !== fields.contentUnit || previous.quantityPerPiece !== fields.quantityPerPiece)) {
      throw new Error('Товар используется в техкарте. Сначала уберите его из состава, затем изменяйте единицы или упаковку.')
    }
    const product: Product = { id: id ?? crypto.randomUUID(), ...fields }
    return id ? rows.map(row => row.id === id ? product : row) : [product, ...rows]
  })
}

export function deleteProduct(id: string) {
  return changeProducts((rows) => {
    if (getTechCards().some(card => card.materials.some(line => line.productId === id))) throw new Error('Товар используется в техкарте. Сначала уберите его из состава.')
    return rows.filter(product => product.id !== id)
  })
}
