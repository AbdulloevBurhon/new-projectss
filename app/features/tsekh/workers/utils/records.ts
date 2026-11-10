import { createId } from '~/features/license/utils/createId'
import type { Inventory } from '~/features/tsekh/warehouse/types/inventory'
import type { WorkDraft, Worker, WorkRecord } from '../types/workers'
import { makeMaterialUsage, workMaterials } from './material-usage'
import { workQuantity, workUnitCents } from './work-amount'

export function totalWages(records: WorkRecord[]) {
  return records.reduce((sum, record) => sum + record.wageCents, 0) / 100
}

export function makeWorkRecord(draft: WorkDraft, inventory: Inventory, workers: Worker[], workerName: string, existing?: WorkRecord): WorkRecord {
  const day = new Date(draft.date)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date) || !Number.isFinite(day.getTime())
    || day.toISOString().slice(0, 10) !== draft.date) {
    throw new Error('Укажите дату выполнения.')
  }

  const count = workQuantity(existing?.quantity ?? draft.quantity ?? 1)
  if (count === undefined) throw new Error('Укажите допустимое целое количество дверей.')
  const unitCents = workUnitCents(draft.wage)
  if (unitCents === undefined) {
    throw new Error('Укажите зарплату от 0 до 1 000 000 сом с точностью до двух знаков.')
  }

  const card = inventory.techcards.find(item => item.id === draft.techcardId)
  const name = existing?.techcardId === draft.techcardId ? existing.techcardName : card?.name
  if (!name) throw new Error('Выберите существующую техкарту.')
  const materials = workMaterials(card, inventory, existing, draft.techcardId)
  const usage = makeMaterialUsage(materials, inventory, workers, draft, count, existing)

  return {
    id: existing?.id ?? createId(),
    date: draft.date,
    createdAt: existing?.createdAt,
    techcardId: draft.techcardId,
    techcardName: name,
    wageCents: unitCents * count,
    quantity: count === 1 ? undefined : count,
    finishedWarehouseId: existing?.finishedWarehouseId,
    payment: existing?.payment,
    materialUsage: usage ? { ...usage, workerName: usage.workerName ?? workerName } : undefined,
  }
}
