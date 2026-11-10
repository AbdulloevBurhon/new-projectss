import type { Worker } from '../types/workers'
import { storageKey } from '~/features/tsekh/warehouse/services/inventory-storage'

export const workersStorageKey = 'workshop-workers-v1'

export function readWorkers(): Worker[] {
  const saved = localStorage.getItem(workersStorageKey)
  if (saved === null) return []

  const workers = JSON.parse(saved)
  if (!Array.isArray(workers) || workers.some(worker =>
    typeof worker?.id !== 'string' || typeof worker.name !== 'string' || !Array.isArray(worker.records),
  )) {
    throw new Error('Не удалось прочитать список рабочих.')
  }
  return workers
}

export async function writeWorkers(update: (workers: Worker[]) => void) {
  const commit = () => {
    const workers = readWorkers()
    update(workers)
    try {
      localStorage.setItem(workersStorageKey, JSON.stringify(workers))
    } catch {
      throw new Error('Не удалось сохранить изменения в браузере.')
    }
    return workers
  }
  // Check material availability in the same write queue as warehouse receipts.
  return navigator.locks ? navigator.locks.request(storageKey, commit) : commit()
}
