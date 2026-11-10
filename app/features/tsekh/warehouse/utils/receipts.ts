import { createId } from '~/features/license/utils/createId'
import type { Inventory, Receipt, ReceiptLine } from '../types/inventory'
import { lineTotal, validNumber } from './format'
import { pieceContent, stockUnit } from './products'
import { warehouseKind } from './warehouse-kind'

export type ReceiptLineDraft = { productId: string; quantity: number; unitPrice: number }
export type ReceiptDraft = ReceiptLineDraft[]
export type ReceiptInputs = { quantity: number | string; price: number | string }

export function createReceipt(current: Inventory, warehouseId: string, draft: ReceiptDraft): Receipt {
  const warehouse = current.warehouses.find(item => item.id === warehouseId)
  if (!warehouse || warehouseKind(warehouse) !== 'materials') throw new Error('Выберите склад материалов для поступления.')
  if (!draft.length) throw new Error('Укажите количество хотя бы одного товара.')
  const lines: ReceiptLine[] = draft.map(line => {
    const product = current.products.find(item => item.id === line.productId)
    if (!product) throw new Error('Один из товаров уже удалён. Проверьте позиции.')
    if (line.quantity <= 0 || !validNumber(line.quantity, 1000) || !validNumber(line.unitPrice, 100)) {
      throw new Error('Проверьте количество и цену каждой позиции.')
    }
    const perPiece = product.quantityPerPiece
    if (perPiece && !Number.isInteger(line.quantity)) {
      throw new Error(`Для товара «${product.name}» укажите целое количество штук.`)
    }
    return {
      ...line,
      productName: product.name,
      unit: perPiece ? 'шт' : product.unit,
      stockQuantity: perPiece ? pieceContent(line.quantity, perPiece) : undefined,
      stockUnit: perPiece ? stockUnit(product) : undefined,
      sum: lineTotal(line.quantity, line.unitPrice),
    }
  })
  return {
    id: createId(),
    date: new Date().toISOString(),
    warehouseId,
    warehouseName: warehouse.name,
    lines,
  }
}
