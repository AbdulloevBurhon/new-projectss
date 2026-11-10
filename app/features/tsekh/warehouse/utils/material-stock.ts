import type { Worker } from '~/features/tsekh/workers/types/workers'
import type { Inventory, Product, TechCard } from '../types/inventory'
import { stockUnit, tracksMaterialUsage } from './products'

export function trackedMaterials(card: TechCard | undefined, products: Product[]) {
  return (card?.materials ?? []).filter(line =>
    products.some(item => item.id === line.productId && stockUnit(item) === line.unit && tracksMaterialUsage(item)),
  )
}

export function materialStock(inventory: Inventory, workers: Worker[], warehouseId: string | null = '', ignoredRecordId?: string) {
  const amounts = new Map<string, number>()
  const includesWarehouse = (id: string | null) => warehouseId === '' || warehouseId === id

  function add(id: string, quantity: number) {
    amounts.set(id, (amounts.get(id) ?? 0) + Math.round(quantity * 1000))
  }

  for (const balance of inventory.openingBalances) {
    if (includesWarehouse(balance.warehouseId)) add(balance.productId, balance.quantity)
  }
  for (const receipt of inventory.receipts) {
    if (!includesWarehouse(receipt.warehouseId)) continue
    for (const line of receipt.lines) add(line.productId, line.stockQuantity ?? line.quantity)
  }
  for (const worker of workers) {
    for (const record of worker.records) {
      const usage = record.materialUsage
      if (!usage || record.id === ignoredRecordId || !includesWarehouse(usage.warehouseId)) continue
      for (const line of usage.lines) add(line.productId, -line.quantity)
    }
  }

  return amounts
}

export function countPieces(capacity: number, amounts: number[]) {
  const capacityMilli = Math.round(capacity * 1000)
  return amounts.reduce((total, amount) => total + Math.ceil(Math.max(0, amount) / capacityMilli), 0)
}
