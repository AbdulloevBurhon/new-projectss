import { createId } from '~/features/license/utils/createId'
import { readLedger } from '~/features/tsekh/accounts/services/accounts-storage'
import { accountBalances } from '~/features/tsekh/accounts/utils/ledger'
import { readInventory } from '~/features/tsekh/warehouse/services/inventory-storage'
import { warehouseKind } from '~/features/tsekh/warehouse/utils/warehouse-kind'
import type { PaidWorkDraft, Worker } from '../types/workers'
import { makeWorkRecord } from '../utils/records'
import { workTotalCents } from '../utils/work-amount'

export function ensureWorkFunds(accountId: string, cents: number) {
  const balance = accountBalances(readLedger()).get(accountId)
  if (balance === undefined) throw new Error('Выберите существующий счёт.')
  if (cents > 0 && balance < cents) throw new Error('На счёте недостаточно средств для оплаты работы.')
}

export function addPaidWork(worker: Worker, workers: Worker[], draft: PaidWorkDraft) {
  if (!draft.lines.length) throw new Error('Выберите хотя бы одну техкарту.')
  const total = workTotalCents(draft.lines)
  if (total === undefined) throw new Error('Проверьте количество и зарплату за штуку в выбранных техкартах.')
  if (new Set(draft.lines.map(line => line.techcardId)).size !== draft.lines.length) {
    throw new Error('Техкарта уже выбрана.')
  }
  ensureWorkFunds(draft.accountId, total)

  const inventory = readInventory()
  const finishedWarehouse = inventory.warehouses.find(item => item.id === draft.finishedWarehouseId && warehouseKind(item) === 'finished')
  if (!finishedWarehouse) throw new Error('Выберите склад готовой продукции.')
  const payment = { id: createId(), accountId: draft.accountId, date: draft.date, workerName: worker.name }
  const createdAt = new Date().toISOString()
  for (const line of draft.lines) {
    const record = makeWorkRecord({ ...line, date: draft.date, warehouseId: draft.warehouseId }, inventory, workers, worker.name)
    worker.records.push({ ...record, createdAt, payment, finishedWarehouseId: finishedWarehouse.id })
  }
}
