import type { Product, ProductUnit } from '../products/products.types'
import type { TechCard, TechCardMaterial, TechCardMaterialDraft } from './techcards.types'

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

export function validNumber(value: number, scale: number) {
  return Number.isFinite(value) && value >= 0 && value <= 1_000_000
    && Math.abs(value * scale - Math.round(value * scale)) < 0.000001
}

export function makeMaterials(draft: TechCardMaterialDraft[], products: Product[], previous?: TechCard): TechCardMaterial[] {
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
