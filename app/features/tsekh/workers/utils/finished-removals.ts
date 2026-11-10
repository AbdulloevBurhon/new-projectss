import { readLedger } from '~/features/tsekh/accounts/services/accounts-storage'
import { finishedStock, finishedStockKey } from '~/features/tsekh/warehouse/utils/finished-stock'
import type { Worker, WorkRecord } from '../types/workers'

export function ensureFinishedRemovals(workers: Worker[], records: WorkRecord[]) {
  if (!records.length) return
  const positions = finishedStock(workers, readLedger().movements)
  for (const record of records) {
    const position = positions.get(finishedStockKey(record.techcardId, record.finishedWarehouseId))
    if (!position || position.available < (record.quantity ?? 1)) {
      throw new Error(`Изделие «${record.techcardName}» уже продано. Сначала отмените связанную продажу.`)
    }
    position.available -= record.quantity ?? 1
  }
}
