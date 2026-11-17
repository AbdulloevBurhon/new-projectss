import { productUnits, type Product, type ProductUnit } from '../products/products.types'
import type { TechCard, TechCardDraft, TechCardMaterial, TechCardMaterialDraft } from './techcards.types'

export const techCardsKey = 'obshaya:data:tsekh:techcards'

export function stockUnit(product: Product): ProductUnit {
  return product.contentUnit ?? product.unit
}

export function materialLimit(pieces: number | string | undefined, capacity: number) {
  const amount = Math.round((Number(pieces) || 0) * Math.round(capacity * 1000)) / 1000
  return Math.min(1_000_000, amount)
}

export function materialPieces(material: TechCardMaterial, capacity: number, packageUnit: ProductUnit = 'шт') {
  if (material.pieces !== undefined) return material.pieces
  const ratio = Math.round(material.quantity * 1000) / Math.round(capacity * 1000)
  return packageUnit === 'кг' ? Math.max(0.001, Math.round(ratio * 1000) / 1000) : Math.max(1, Math.ceil(ratio))
}

function validNumber(value: number, scale: number) {
  return Number.isFinite(value) && value >= 0 && value <= 1_000_000
    && Math.abs(value * scale - Math.round(value * scale)) < 0.000001
}

function isUnit(value: unknown): value is ProductUnit {
  return typeof value === 'string' && productUnits.some(unit => unit === value)
}

function isTechCard(value: unknown): value is TechCard {
  if (!value || typeof value !== 'object') return false
  const card = value as Record<string, unknown>
  if (typeof card.id !== 'string' || typeof card.name !== 'string' || typeof card.cost !== 'number'
    || typeof card.price !== 'number' || !Array.isArray(card.materials)) return false
  if (card.photo !== undefined && typeof card.photo !== 'string') return false
  return card.materials.every((item: unknown) => {
    if (!item || typeof item !== 'object') return false
    const material = item as Record<string, unknown>
    return typeof material.productId === 'string' && typeof material.name === 'string'
      && isUnit(material.unit) && typeof material.quantity === 'number'
      && (material.pieces === undefined || typeof material.pieces === 'number')
      && (material.packageUnit === undefined || isUnit(material.packageUnit))
  })
}

export function getTechCards(): TechCard[] {
  const raw = localStorage.getItem(techCardsKey)
  if (raw === null) return []
  const cards: unknown = JSON.parse(raw)
  if (!Array.isArray(cards) || !cards.every(isTechCard)) throw new Error('Не удалось прочитать сохранённые техкарты.')
  return cards as TechCard[]
}

function changeTechCards(change: (cards: TechCard[]) => TechCard[]) {
  const save = () => {
    const cards = change(getTechCards())
    try {
      localStorage.setItem(techCardsKey, JSON.stringify(cards))
    } catch {
      throw new Error('Не удалось сохранить техкарты в браузере.')
    }
    return cards
  }
  return navigator.locks ? navigator.locks.request(techCardsKey, save) : Promise.resolve(save())
}

function makeMaterials(draft: TechCardMaterialDraft[], products: Product[], previous?: TechCard): TechCardMaterial[] {
  const seen = new Set<string>()
  return draft.map((line) => {
    const oldLine = previous?.materials.find(item => item.productId === line.productId)
    const current = products.find(item => item.id === line.productId)
    const source = oldLine ?? current
    if (!source) throw new Error(`Товар «${line.name}» удалён из каталога. Уберите его из состава.`)
    const unit = current ? stockUnit(current) : source.unit
    if (unit !== line.unit) throw new Error(`У товара «${source.name}» изменилась единица измерения. Выберите его заново.`)
    if (seen.has(line.productId)) throw new Error('Товар уже есть в составе.')
    seen.add(line.productId)

    const quantity = Number(line.quantity)
    if (quantity <= 0 || !validNumber(quantity, 1000)) throw new Error(`Укажите положительное количество для товара «${source.name}».`)
    const material: TechCardMaterial = { productId: line.productId, name: source.name, unit, quantity }
    const capacity = current?.quantityPerPiece
    if (capacity === undefined) return material

    const pieces = Number(line.pieces)
    const packageUnit = current?.unit ?? oldLine?.packageUnit ?? 'шт'
    const validPieces = packageUnit === 'кг'
      ? pieces > 0 && validNumber(pieces, 1000)
      : Number.isInteger(pieces) && pieces >= 1
    if (!validPieces || pieces > 1_000_000) throw new Error(`Укажите корректное количество ${packageUnit} для товара «${source.name}».`)
    const limit = materialLimit(pieces, capacity)
    if (quantity > limit) throw new Error(`Расход «${source.name}» не может превышать ${limit} ${unit} для выбранного количества ${packageUnit}.`)
    return { ...material, pieces, packageUnit }
  })
}

export function saveTechCard(draft: TechCardDraft, products: Product[], id?: string) {
  const name = draft.name.trim()
  if (!name || name.length > 100) throw new Error('Введите название техкарты до 100 символов.')
  const cost = Number(draft.cost)
  const price = Number(draft.price)
  if (draft.cost === '' || draft.price === '' || !validNumber(cost, 100) || !validNumber(price, 100)) {
    throw new Error('Введите цены от 0 до 1 000 000 сом с точностью до двух знаков.')
  }
  if (draft.photo && (!draft.photo.startsWith('data:image/webp;base64,') || draft.photo.length > 500_000)) {
    throw new Error('Фото техкарты имеет неподдерживаемый формат или слишком большой размер.')
  }

  return changeTechCards((cards) => {
    const previous = id ? cards.find(card => card.id === id) : undefined
    if (id && !previous) throw new Error('Техкарта уже удалена.')
    const card: TechCard = {
      id: id ?? crypto.randomUUID(),
      name,
      cost,
      price,
      photo: draft.photo || undefined,
      materials: makeMaterials(draft.materials, products, previous),
    }
    return id ? cards.map(item => item.id === id ? card : item) : [card, ...cards]
  })
}

export function deleteTechCard(id: string) {
  return changeTechCards(cards => cards.filter(card => card.id !== id))
}
