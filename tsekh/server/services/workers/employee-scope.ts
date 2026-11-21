import type { H3Event } from 'h3'
import db from '../../database/accounts/accounts.database'
import q from '../../database/sales/queries'
import type { Employee, EmployeeResourceAccess } from '../../../endpoints/workers/types'
import { workerError } from './workers.service'

export type Scope = EmployeeResourceAccess | undefined
type Kind = keyof EmployeeResourceAccess

export function allowsResource(scope: Scope, kind: Kind, id: unknown) {
  const allowed = scope?.[kind]
  return allowed == null || (typeof id === 'string' && allowed.includes(id))
}

export function onlyResources<T>(rows: T[], scope: Scope, kind: Kind, key: keyof T) {
  return rows.filter(row => allowsResource(scope, kind, row[key]))
}

function requireResource(scope: Scope, kind: Kind, id: unknown) {
  if (!allowsResource(scope, kind, id)) throw workerError(403, 'У сотрудника нет доступа к этому складу или счёту.')
}

type BoundRow = { warehouse?: string; account?: string; targetAccount?: string }
function requireRow(scope: Scope, sql: string, id: string) {
  const row = db.prepare(sql).get({ id }) as BoundRow | undefined
  if (!row) return
  if (row.warehouse !== undefined) requireResource(scope, 'warehouses', row.warehouse)
  if (row.account !== undefined) requireResource(scope, 'accounts', row.account)
  if (row.targetAccount !== undefined) requireResource(scope, 'accounts', row.targetAccount)
}

export async function restrictEmployeeResources(event: H3Event, worker: Employee, parts: string[]) {
  const scope = worker.resources
  if (scope?.warehouses == null && scope?.accounts == null) return
  const [, resource, action = '', record = '', detail] = parts
  const id = decodeURIComponent(action)
  const method = getMethod(event)
  const write = method === 'POST' || method === 'PATCH'
  const body = write ? (await readBody<Record<string, unknown>>(event) ?? {}) : {}
  const account = (key: string) => requireResource(scope, 'accounts', body[key])
  const warehouse = (key: string) => requireResource(scope, 'warehouses', body[key])

  if (resource === 'warehouses') {
    if (method === 'POST') requireResource(scope, 'warehouses', null)
    else if (id) requireResource(scope, 'warehouses', id)
  }
  if (resource === 'accounts') {
    const operations = { receipts: q.scopeReceipt, expenses: q.scopeExpense, transfers: q.scopeTransfer }
    const operation = operations[action as keyof typeof operations]
    if (typeof operation === 'string') {
      if (record) requireRow(scope, operation, decodeURIComponent(record))
      if (write && action === 'transfers') { account('sourceAccountId'); account('targetAccountId') }
      else if (write) account('accountId')
    } else if (method === 'POST') requireResource(scope, 'accounts', null)
    else if (id) requireResource(scope, 'accounts', id)
  }
  if (resource === 'stock-receipts') {
    if (id) requireRow(scope, q.scopeStockReceipt, id)
    if (method === 'POST') { warehouse('warehouseId'); account('accountId') }
    else if (write && body.accountId != null) account('accountId')
  }
  if (resource === 'sales') {
    if (action === 'checkout' && write) { warehouse('warehouse'); account('account') }
    if (action === 'receipt' && record) requireRow(scope, q.scopeSale, decodeURIComponent(record))
    if (action === 'clients' && detail === 'payments' && write) account('account')
    if (action === 'movement' && write) {
      if (typeof body.lot === 'string') requireRow(scope, q.scopeStockLot, body.lot)
      if (body.target != null) warehouse('target')
    }
  }
}
