import type { Inventory, TechCard, TechCardMaterial } from '~/features/tsekh/warehouse/types/inventory'
import { materialStock, trackedMaterials } from '~/features/tsekh/warehouse/utils/material-stock'
import { quantity } from '~/features/tsekh/warehouse/utils/format'
import { materialLimit, materialPieces } from '~/features/tsekh/warehouse/utils/techcards'
import { receiptCostCents } from '~/features/tsekh/warehouse/utils/receipt-cost'
import { warehouseKind } from '~/features/tsekh/warehouse/utils/warehouse-kind'
import type { MaterialUsage, WorkDraft, Worker, WorkRecord } from '../types/workers'

export function workMaterials(card: TechCard | undefined, inventory: Inventory, existing: WorkRecord | undefined, techcardId: string) {
  if (existing?.techcardId === techcardId) return existing.materialUsage?.lines ?? []
  return trackedMaterials(card, inventory.products)
}

export function scaleWorkMaterials(lines: TechCardMaterial[], count: number) {
  if (count === 1) return lines
  return lines.map(line => ({
    ...line,
    quantity: Math.round(line.quantity * 1000) * count / 1000,
    pieces: line.pieces === undefined ? undefined : line.pieces * count,
  }))
}

export function makeMaterialUsage(
  lines: TechCardMaterial[],
  inventory: Inventory,
  workers: Worker[],
  draft: WorkDraft,
  count: number,
  existing?: WorkRecord,
): MaterialUsage | undefined {
  if (!lines.length) return
  const previous = existing?.materialUsage
  const warehouseId = draft.warehouseId || previous?.warehouseId
  if (previous && lines === previous.lines && warehouseId === previous.warehouseId) return previous
  const warehouse = inventory.warehouses.find(item => item.id === warehouseId)
  if (!warehouse || warehouseKind(warehouse) !== 'materials') {
    throw new Error('Выберите склад для списания материалов.')
  }
  const stock = materialStock(inventory, workers, warehouse.id, existing?.id)
  const fromRecipe = lines !== previous?.lines
  const required = fromRecipe ? scaleWorkMaterials(lines, count) : lines
  if (fromRecipe) {
    for (const line of lines) {
      const capacity = inventory.products.find(product => product.id === line.productId)?.quantityPerPiece
      if (capacity === undefined) continue
      const limit = materialLimit(materialPieces(line, capacity), capacity)
      if (line.quantity > limit) throw new Error(`Уточните расход «${line.name}» в техкарте. Максимум ${quantity(limit)} ${line.unit}.`)
    }
  }
  for (const line of required) {
    const available = stock.get(line.productId) ?? 0
    if (available < Math.round(line.quantity * 1000)) {
      throw new Error(`Не хватает «${line.name}». Нужно ${quantity(line.quantity)} ${line.unit}, на складе ${quantity(available / 1000)} ${line.unit}.`)
    }
  }
  return {
    warehouseId: warehouse.id,
    warehouseName: warehouse.name,
    workerName: previous?.workerName,
    lines: required.map(line => ({ ...line, costCents: receiptCostCents(inventory.receipts, warehouse.id, line) })),
  }
}
