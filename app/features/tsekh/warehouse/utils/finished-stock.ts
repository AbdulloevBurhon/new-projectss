import type { AccountMovement } from '~/features/tsekh/accounts/types/accounts'
import type { Worker } from '~/features/tsekh/workers/types/workers'
import type { Warehouse } from '../types/inventory'

export const unassignedWarehouse = 'unassigned'
export const unassignedWarehouseName = 'Без склада'

export function finishedStockKey(techcardId: string, warehouseId?: string) {
  return JSON.stringify([techcardId, warehouseId ?? null])
}

export function finishedWarehouseName(warehouseId: string | undefined, warehouses: Warehouse[]) {
  if (!warehouseId) return unassignedWarehouseName
  return warehouses.find(warehouse => warehouse.id === warehouseId)?.name ?? 'Склад недоступен'
}

interface FinishedPosition {
  id: string
  techcardId: string
  name: string
  warehouseId?: string
  available: number
}

export function finishedStock(workers: Worker[], movements: AccountMovement[]) {
  const positions = new Map<string, FinishedPosition>()

  function add(techcardId: string, name: string, warehouseId: string | undefined, quantity: number) {
    const id = finishedStockKey(techcardId, warehouseId)
    const current = positions.get(id)
    if (current) current.available += quantity
    else positions.set(id, { id, techcardId, name, warehouseId, available: quantity })
  }

  for (const worker of workers) {
    for (const record of worker.records) {
      add(record.techcardId, record.techcardName, record.finishedWarehouseId, record.quantity ?? 1)
    }
  }
  for (const movement of movements) {
    for (const line of movement.sale ?? []) add(line.techcardId, line.name, line.warehouseId, -line.quantity)
  }
  return positions
}
