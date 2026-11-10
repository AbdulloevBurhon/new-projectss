import type { Worker } from '~/features/tsekh/workers/types/workers'
import { newestOperationFirst } from '~/features/tsekh/utils/operation-date'
import type { Inventory } from '../types/inventory'
import { localDate } from './format'

interface HistoryLine {
  productName: string
  quantity: number
  unit: string
  stockQuantity?: number
  stockUnit?: string
  costCents?: number
}

interface HistoryOperation {
  id: string
  kind: 'receipt' | 'expense'
  date: string
  createdAt?: string
  warehouseId: string
  warehouseName: string
  workerName?: string
  techcardName?: string
  lines: HistoryLine[]
}

export function warehouseHistory(inventory: Inventory, workers: Worker[]): HistoryOperation[] {
  const names = new Map(inventory.warehouses.map(warehouse => [warehouse.id, warehouse.name]))
  const expenses = workers.flatMap(worker => worker.records.flatMap((record): HistoryOperation[] => {
    const usage = record.materialUsage
    if (!usage) return []
    return [{
      id: `expense-${record.id}`,
      kind: 'expense',
      date: record.date,
      createdAt: record.createdAt,
      warehouseId: usage.warehouseId,
      warehouseName: usage.warehouseName ?? names.get(usage.warehouseId) ?? '—',
      workerName: usage.workerName ?? worker.name,
      techcardName: record.techcardName,
      lines: usage.lines.map(line => ({ ...line, productName: line.name })),
    }]
  }))
  const receipts = inventory.receipts.map((receipt): HistoryOperation => ({
    id: `receipt-${receipt.id}`,
    kind: 'receipt',
    date: localDate(receipt.date),
    createdAt: receipt.date,
    warehouseId: receipt.warehouseId,
    warehouseName: receipt.warehouseName,
    lines: receipt.lines.map(line => ({ ...line, costCents: Math.round(line.sum * 100) })),
  }))
  return [...expenses, ...receipts].sort(newestOperationFirst)
}
