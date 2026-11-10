import type { Product, TechCard, TechCardDraft, TechCardMaterial, Warehouse } from '../types/inventory'
import { quantity as formatQuantity, validNumber } from './format'
import { pieceContent, stockUnit } from './products'

export function materialPieces(material: TechCardMaterial, capacity: number) {
  return material.pieces ?? Math.max(1, Math.ceil(Math.round(material.quantity * 1000) / Math.round(capacity * 1000)))
}

export function materialLimit(pieces: number | string | undefined, capacity: number) {
  return Math.min(1_000_000, pieceContent(Number(pieces) || 0, capacity))
}

export function makeTechCard(
  entry: Warehouse,
  draft: TechCardDraft,
  products: Product[],
  previous?: TechCard,
): TechCard {
  const cost = Number(draft.cost)
  const price = Number(draft.price)
  if (draft.cost === '' || draft.price === '' || !validNumber(cost, 100) || !validNumber(price, 100)) {
    throw new Error('Введите цены от 0 до 1 000 000 сом с точностью до двух знаков.')
  }

  const seen = new Set<string>()
  const materials: TechCardMaterial[] = draft.materials.map(line => {
    const oldLine = previous?.materials?.find(item => item.productId === line.productId)
    const current = products.find(item => item.id === line.productId)
    const product = oldLine ?? current
    if (!product) throw new Error(`Товар «${line.name}» удалён из каталога. Уберите его из списка.`)
    const unit = current ? stockUnit(current) : product.unit
    if (unit !== line.unit) {
      throw new Error(`У товара «${product.name}» изменилась единица измерения. Выберите его заново.`)
    }
    if (seen.has(line.productId)) throw new Error('Товар уже есть в составе.')
    seen.add(line.productId)

    const quantity = Number(line.quantity)
    if (quantity <= 0 || !validNumber(quantity, 1000)) {
      throw new Error(`Укажите положительное количество для товара «${product.name}».`)
    }
    const capacity = current?.quantityPerPiece
    const material: TechCardMaterial = { productId: line.productId, name: product.name, unit, quantity }
    if (capacity === undefined) return material

    const pieces = Number(line.pieces)
    if (!Number.isInteger(pieces) || pieces < 1 || pieces > 1_000_000) {
      throw new Error(`Укажите целое количество штук для товара «${product.name}».`)
    }
    const limit = materialLimit(pieces, capacity)
    if (quantity > limit) {
      throw new Error(`Расход «${product.name}» не может превышать ${formatQuantity(limit)} ${unit} для выбранного количества штук.`)
    }
    return { ...material, pieces }
  })

  return { ...entry, cost, price, photo: draft.photo || undefined, materials }
}
