import db from '../../database/warehouse/stock-receipts.schema'
import { permits } from '../../../endpoints/workers/permissions'
import type { Employee } from '../../../endpoints/workers/types'
import { workerError } from '../workers/workers.service'
import q from '../../database/sales/queries'
import { clientDetails, repayClientDebt } from './client-payments.service'
import { allowsResource, onlyResources } from '../workers/employee-scope'
import { resourceParameters } from '../workers/employee-resource-access'
import { salesCatalog } from './catalog.service'

db.transaction(() => {
  db.exec(q.schema)
  db.exec(q.clientPaymentSchema)
  db.exec(q.revisionSchema)
  db.exec(q.expirySchema)
}).immediate()
export function salesRequest(path: string, method: string, body: Record<string, any>, worker?: Employee) {
  const [resource, client, action, extra] = path.split('/')
  if (resource === 'clients' && client && !extra) {
    if (!action && method === 'GET') return clientDetails(decodeURIComponent(client))
    if (action === 'payments' && method === 'POST') return repayClientDebt(decodeURIComponent(client), body, worker?.name ?? 'Админ')
  }
  const id = body.id
  if (method === 'GET') {
    const scope = worker?.resources
    const rows = (sql: string) => db.prepare(sql).all() as Record<string, unknown>[]
    if (path === 'catalog') return salesCatalog(body, scope)
    if (path === 'history') return onlyResources(rows(q.history), scope, 'warehouses', 'warehouseId')
      .filter(row => row.accountId == null || allowsResource(scope, 'accounts', row.accountId))
    if (path === 'stock') return onlyResources(rows(q.stock), scope, 'warehouses', 'warehouse')
    if (path === 'clients') return rows(q.clients)
    if (path === 'report') return onlyResources(onlyResources(rows(q.report), scope, 'warehouses', 'warehouse'), scope, 'accounts', 'account')
    if (path === 'warehouse-accounts') return onlyResources(rows(q.warehouseAccounts), scope, 'accounts', 'id')
    if (resource === 'receipt' && client && !extra && (!action || action === 'details')) {
      const id = decodeURIComponent(client)
      if (worker && !permits(worker.permissions, 'reports') && !db.prepare(q.ownReceipt).get({ id, worker: worker.id })) {
        throw workerError(403, 'Можно открыть только свой чек.')
      }
      const lines = db.prepare(q.detail).all({ id })
      if (!action) return lines
      const receipt = db.prepare(q.receiptHeader).get({ id })
      if (!receipt) throw createError({ statusCode: 404, message: 'Чек не найден.' })
      return { receipt, lines }
    }
  }
  if (path === 'movement' && method === 'POST') {
    if (!db.prepare(q.move).run(body).changes) throw Error('Проверьте склад, количество и доступный остаток.')
    return { id }
  }
  if (path === 'clients' && ['POST','PATCH','DELETE'].includes(method)) {
    const sql = method === 'POST' ? q.createClient : method === 'PATCH' ? q.editClient : q.deleteClient
    db.prepare(sql).run(body)
    return { id }
  }
  if (method !== 'POST' || path !== 'checkout') throw createError({statusCode:404})
  return db.transaction(() => {
    if (typeof id !== 'string' || !id || !Array.isArray(body.lines) || !body.lines.length ||
      ![body.discount,body.tender].every(n => Number.isSafeInteger(n) && n >= 0)) throw Error('Некорректная сумма оплаты.')
    if (db.prepare(q.existing).get({id})) return {id}
    db.exec(q.stage)
    const data: Record<string, any> = {...body, lines: JSON.stringify(body.lines)}
    db.prepare(q.lines).run(data)
    if (!(db.prepare(q.valid).get(data) as {ok:number}).ok) throw Error('Проверьте количество и доступный остаток.')
    if (worker) {
      const has = (right: 'sales.price' | 'sales.debt' | 'sales.discount' | 'sales.settings') => Number(permits(worker.permissions, right))
      const result = db.prepare(q.workerCheckout).get({
        ...data, ...resourceParameters(worker.resources),
        settingsAllowed: has('sales.settings'), priceAllowed: has('sales.price'), debtAllowed: has('sales.debt'), discountAllowed: has('sales.discount'),
      }) as { ok: number }
      if (!result.ok) throw workerError(403, 'У вас нет прав на выбранные настройки, цену, скидку или продажу в долг.')
      data.seller = worker.name
      data.role = worker.role
    }
    db.prepare(q.post).run(data)
    if (worker) db.prepare(q.assignSaleWorker).run({ id, worker: worker.id })
    db.prepare(q.copy).run(data)
    db.prepare(q.credit).run(data)
    return {id}
  }).immediate()
}
