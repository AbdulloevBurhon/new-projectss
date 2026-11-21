import { productUnits, type Product, type ProductUnit } from '../products/products.types'
import type { TechCard, TechCardDraft } from './techcards.types'
import { makeMaterials, validNumber } from './techcard-materials'

export { materialLimit, materialPieces, stockUnit } from './techcard-materials'

export const techCardsKey = 'obshaya:data:tsekh:techcards'

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
