import { readLedger } from '~/features/tsekh/accounts/services/accounts-storage'
import { readWorkers } from '~/features/tsekh/workers/services/workers-storage'
import type { Inventory } from '../types/inventory'

export function warehouseHasOperations(inventory: Inventory, id: string) {
  return inventory.openingBalances.some(line => line.warehouseId === id)
    || inventory.receipts.some(receipt => receipt.warehouseId === id)
    || readWorkers().some(worker => worker.records.some(record =>
      record.finishedWarehouseId === id || record.materialUsage?.warehouseId === id))
    || readLedger().movements.some(movement => movement.sale?.some(line => line.warehouseId === id))
}

export function techcardHasProduction(id: string) {
  return readWorkers().some(worker => worker.records.some(record => record.techcardId === id && record.finishedWarehouseId))
    || readLedger().movements.some(movement => movement.sale?.some(line => line.techcardId === id && line.warehouseId))
}
