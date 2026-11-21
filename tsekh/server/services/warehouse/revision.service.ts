import { randomUUID } from 'node:crypto'
import type { RevisionHeader } from '../../../endpoints/revision/service'
import type { Employee } from '../../../endpoints/workers/types'
import { permits } from '../../../endpoints/workers/permissions'
import db from '../../database/warehouse/stock-receipts.schema'
import q from '../../database/sales/queries'
import '../sales/sales.service'
import { allowsResource } from '../workers/employee-scope'
import { workerError as fail } from '../workers/workers.service'

const headers = db.prepare(q.revisionHeaders)
const lotRows = db.prepare(q.revisionRows)
const counts = db.prepare(q.revisionCounts)
const warehouseExists = db.prepare('SELECT 1 FROM warehouses WHERE id=@warehouse')
const key = (value: unknown) => typeof value === 'string' && value.length <= 200 ? value : ''
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const changed = () => fail(409, 'Данные изменились. Обновите ревизию и проверьте подсчёт.')

const read = db.transaction((warehouse: string, id: string) => {
  const history = headers.all({ warehouse }) as RevisionHeader[]
  const header = history.find(row => id ? row.id === id : row.status === 'draft') ?? null
  if (id && !header) throw fail(404, 'Ревизия не найдена.')
  return { header, history, rows: header ? lotRows.all({ warehouse, id: header.id, draft: Number(header.status === 'draft') }) : [] }
})

const write = db.transaction((warehouse: string, body: Record<string, unknown>, worker?: Employee) => {
  const { action, version } = body
  const history = headers.all({ warehouse }) as RevisionHeader[]
  const now = Date.now()
  if (action === 'start') {
    const existing = history.find(row => row.status === 'draft')
    if (existing) return { id: existing.id, version: existing.version }
    const id = randomUUID()
    if (!db.prepare(q.revisionStart).run({ id, warehouse, now }).changes) throw changed()
    return { id, version: 0 }
  }
  if (action !== 'count' && action !== 'post' && action !== 'cancel') throw fail(400, 'Неизвестное действие ревизии.')
  if (action !== 'count' && worker && !permits(worker.permissions, 'warehouses.edit')) {
    throw fail(403, 'Для проведения или отмены нужно право редактировать склад.')
  }
  const revision = history.find(row => row.id === key(body.id))
  if (!revision) throw fail(404, 'Ревизия не найдена.')
  const { id } = revision
  const status = action === 'post' ? 'posted' : 'cancelled'
  if (action !== 'count' && revision.status === status) return { id, version: revision.version }
  if (revision.status !== 'draft' || revision.version !== version) throw changed()

  if (action === 'count') {
    const { lot, actual, book } = body
    if (typeof lot !== 'string' || !lot || lot.length > 2048
      || (actual !== null && (!finite(actual) || actual < 0 || actual > 1e9 || !finite(book)))) {
      throw fail(400, 'Проверьте фактическое количество.')
    }
    if (actual === null) db.prepare(q.revisionClear).run({ id, lot })
    else if (!db.prepare(q.revisionSave).run({ id, lot, actual, book, warehouse }).changes) throw changed()
    db.prepare(q.revisionTouch).run({ id })
  } else {
    if (action === 'post') {
      const validation = counts.get({ id }) as { counted: number; stale: number }
      if (!validation.counted) throw fail(400, 'Сначала посчитайте хотя бы одну позицию.')
      if (validation.stale) throw fail(409, 'Остаток изменился. Пересчитайте отмеченные позиции.')
    }
    db.prepare(q.revisionClose).run({ id, status, now, actor: worker?.name ?? 'Админ', employee: worker?.id ?? null })
    if (action === 'post') db.prepare(q.revisionMovements).run({ id, now })
  }
  return { id, version: revision.version + 1 }
})

export function revisionRequest(method: 'GET' | 'POST', input: unknown, worker?: Employee) {
  const body = (input ?? {}) as Record<string, unknown>
  const warehouse = key(body.warehouse)
  if (!warehouse) throw fail(400, 'Выберите склад.')
  if (worker && (!permits(worker.permissions, 'warehouses') || !allowsResource(worker.resources, 'warehouses', warehouse))) {
    throw fail(403, 'У вас нет доступа к этому складу.')
  }
  if (!warehouseExists.get({ warehouse })) throw fail(404, 'Склад не найден.')
  return method === 'GET' ? read(warehouse, key(body.id)) : write.immediate(warehouse, body, worker)
}
