import type { Inventory, Product, ProductDraft, Warehouse } from '../types/inventory'
import { validNumber } from './format'

export const units = ['шт', 'кг', 'м', 'м²', 'м³', 'л', 'т']

export function stockUnit(product: Product) {
  return product.contentUnit ?? product.unit
}

export function pieceContent(pieces: number, capacity: number) {
  return Math.round(pieces * Math.round(capacity * 1000)) / 1000
}

export function tracksMaterialUsage(product: Product) {
  return product.unit === 'л' || product.quantityPerPiece !== undefined
}

export function productInRecipe(inventory: Inventory, id: string) {
  return inventory.techcards.some(card => card.materials?.some(line => line.productId === id))
}

export function makeProduct(entry: Warehouse, draft: ProductDraft, inventory: Inventory): Product {
  const { unit, packaged, contentUnit } = draft
  if (!units.includes(unit)) throw new Error('Выберите единицу измерения.')
  if (packaged && (unit !== 'шт' || !units.includes(contentUnit))) {
    throw new Error('Для содержимого выберите основную единицу «шт» и единицу содержимого.')
  }

  const previous = inventory.products.find(item => item.id === entry.id)
  const hasStockRecords = inventory.openingBalances.some(line => line.productId === entry.id)
    || inventory.receipts.some(receipt => receipt.lines.some(line => line.productId === entry.id))
  const inRecipe = productInRecipe(inventory, entry.id)
  if (previous && previous.unit !== unit && (hasStockRecords || inRecipe)) {
    throw new Error('У товара с поступлениями, остатком или техкартами нельзя менять единицу измерения. Создайте отдельный товар.')
  }

  const quantity = Number(draft.quantityPerPiece)
  if (packaged && (quantity <= 0 || !validNumber(quantity, 1000))) {
    throw new Error('Введите количество в одной штуке.')
  }
  if (previous?.quantityPerPiece && (hasStockRecords || inRecipe)
    && (!packaged || quantity !== previous.quantityPerPiece || contentUnit !== previous.contentUnit)) {
    throw new Error('Содержимое товара с поступлениями или техкартами уже зафиксировано. Создайте отдельный товар.')
  }
  if (previous?.unit === 'шт' && !previous.quantityPerPiece && packaged) {
    const incompatible = inventory.receipts.some(receipt => receipt.lines.some(line =>
      line.productId === entry.id && line.stockQuantity !== undefined && line.stockUnit !== contentUnit,
    ))
    if (incompatible) throw new Error('В прежних поступлениях указана другая единица содержимого. Создайте отдельный товар.')
    convertPieceStock(inventory, entry.id, quantity, contentUnit)
  }
  return { ...entry, unit, contentUnit: packaged ? contentUnit : undefined, quantityPerPiece: packaged ? quantity : undefined }
}

function convertPieceStock(inventory: Inventory, id: string, capacity: number, unit: string) {
  for (const line of inventory.openingBalances) {
    if (line.productId === id) line.quantity = pieceContent(line.quantity, capacity)
  }
  for (const receipt of inventory.receipts) {
    for (const line of receipt.lines) {
      if (line.productId !== id || line.stockQuantity !== undefined) continue
      line.stockQuantity = pieceContent(line.quantity, capacity)
      line.stockUnit = unit
    }
  }
  for (const card of inventory.techcards) {
    for (const line of card.materials ?? []) {
      if (line.productId !== id || line.unit !== 'шт') continue
      line.quantity = pieceContent(line.quantity, capacity)
      line.unit = unit
    }
  }
}
