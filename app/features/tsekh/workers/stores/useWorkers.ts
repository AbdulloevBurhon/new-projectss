import { createId } from '~/features/license/utils/createId'
import { readInventory } from '~/features/tsekh/warehouse/services/inventory-storage'
import { addPaidWork, ensureWorkFunds } from '../services/paid-work'
import { readWorkers, writeWorkers } from '../services/workers-storage'
import type { PaidWorkDraft, WorkDraft, Worker } from '../types/workers'
import { makeWorkRecord } from '../utils/records'
import { ensureFinishedRemovals } from '../utils/finished-removals'

function findWorker(workers: Worker[], id: string) {
  const worker = workers.find(item => item.id === id)
  if (!worker) throw new Error('Рабочий уже удалён.')
  return worker
}

export function useWorkers() {
  const workers = useState<Worker[]>('workshop-workers', () => [])
  const ready = useState('workshop-workers-ready', () => false)
  const storageError = useState('workshop-workers-error', () => '')

  function load() {
    try {
      workers.value = readWorkers()
      storageError.value = ''
    } catch {
      storageError.value = 'Хранилище рабочих недоступно. Обновите страницу и попробуйте снова.'
    } finally {
      ready.value = true
    }
  }

  async function change(update: (workers: Worker[]) => void) {
    workers.value = await writeWorkers(update)
  }

  function saveWorker(id: string | undefined, input: string) {
    const name = input.trim()
    return change(items => {
      if (!name || name.length > 100) throw new Error('Введите имя до 100 символов.')
      if (id) findWorker(items, id).name = name
      else items.push({ id: createId(), name, records: [] })
    })
  }

  function deleteWorker(id: string) {
    return change(items => {
      const worker = findWorker(items, id)
      ensureFinishedRemovals(items, worker.records)
      items.splice(items.indexOf(worker), 1)
    })
  }

  function saveRecord(workerId: string, recordId: string | undefined, draft: WorkDraft) {
    return change(items => {
      const { records, name } = findWorker(items, workerId)
      const index = records.findIndex(record => record.id === recordId)
      if (recordId && index === -1) throw new Error('Запись о работе уже удалена.')
      const previous = records[index]
      const record = makeWorkRecord(draft, readInventory(), items, name, previous)
      if (previous && previous.techcardId !== record.techcardId) ensureFinishedRemovals(items, [previous])
      if (previous?.payment && record.wageCents > previous.wageCents) {
        ensureWorkFunds(previous.payment.accountId, record.wageCents - previous.wageCents)
      }
      if (index === -1) records.push({ ...record, createdAt: new Date().toISOString() })
      else records[index] = record
    })
  }

  function savePaidWork(workerId: string, draft: PaidWorkDraft) {
    return change(items => addPaidWork(findWorker(items, workerId), items, draft))
  }

  function deleteRecord(workerId: string, recordId: string) {
    return change(items => {
      const worker = findWorker(items, workerId)
      ensureFinishedRemovals(items, worker.records.filter(record => record.id === recordId))
      worker.records = worker.records.filter(record => record.id !== recordId)
    })
  }

  return { workers, ready, storageError, load, saveWorker, deleteWorker, saveRecord, deleteRecord, savePaidWork }
}
