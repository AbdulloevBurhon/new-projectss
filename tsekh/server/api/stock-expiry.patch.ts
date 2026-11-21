import db from '../database/warehouse/stock-receipts.schema'
import q from '../database/sales/queries'
import { processStockReceipts, readExpiry, requestError } from '../services/warehouse/stock-receipts.service'
import { allowsResource, type Scope } from '../services/workers/employee-scope'

const warehouses = db.prepare(q.expiryEditWarehouses)
const update = db.prepare(q.expiryUpdate)
const save = db.transaction((body: Record<string, unknown>, scope: Scope) => {
  const { receipt, lot } = body
  if (typeof receipt !== 'string' || !receipt || typeof lot !== 'string' || !lot
    || !Object.hasOwn(body, 'expiresOn') || !Object.hasOwn(body, 'previous')) {
    throw requestError(400, 'Проверьте данные партии.')
  }
  const affected = warehouses.all({ receipt, lot }) as { warehouse: string }[]
  if (!affected.length) throw requestError(409, 'Партия больше не доступна. Обновите список.')
  if (affected.some(row => !allowsResource(scope, 'warehouses', row.warehouse))) {
    throw requestError(403, 'Для изменения даты нужен доступ ко всем складам этой партии.')
  }
  const expiresOn = readExpiry(body.expiresOn), previous = readExpiry(body.previous)
  if (!update.run({ receipt, expiresOn, previous }).changes) throw requestError(409, 'Срок уже изменился. Обновите список.')
  return { expiresOn }
})

export default defineEventHandler(async event => {
  const body = await readBody<Record<string, unknown>>(event)
  processStockReceipts()
  return save.immediate(body ?? {}, event.context.employee?.resources)
})
