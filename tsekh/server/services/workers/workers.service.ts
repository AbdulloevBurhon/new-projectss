import { randomBytes } from 'node:crypto'
import { candidates, matchesPin, pinHash } from './employee-pin'
import { assertNotOwnerPin, ownerPinRequest } from './owner-pin.service'
import db from '../../database/accounts/accounts.database'
import q from '../../database/sales/queries'
import { permits, rights, type Right } from '../../../endpoints/workers/permissions'
import type { Employee, WorkerSale } from '../../../endpoints/workers/types'
import { loadEmployeeResources, readEmployeeResources, resourceParameters, saveEmployeeResources } from './employee-resource-access'

db.exec([q.workersSchema, q.workerResourceSchema, q.ownerPinSchema].join('\n'))

type WorkerRow = Omit<Employee, 'permissions'> & { permissions: string }
type Credentials = WorkerRow & { salt: string; pin_hash: string }
function employee({ id, name, role, phone, permissions }: WorkerRow): Employee {
  const stored = JSON.parse(permissions) as string[]
  const effective = stored.filter((right): right is Right => rights.includes(right as Right))
  // Keep the old grant until the administrator saves the employee's rights explicitly.
  if (!stored.includes('clients.pay.configured') && !effective.includes('clients.pay')
    && permits(effective, 'clients.edit') && permits(effective, 'accounts')) effective.push('clients.pay')
  return { id, name, role, phone, permissions: effective, resources: loadEmployeeResources(id) }
}

export function workerError(statusCode: number, message: string) {
  return createError({ statusCode, message, data: { message } })
}

export function currentWorker(token?: string) {
  if (!token) return null
  const row = db.prepare(q.workerSession).get({ token, now: Date.now() }) as WorkerRow | undefined
  if (!row) throw workerError(401, 'Войдите снова в режим сотрудника.')
  return employee(row)
}

function text(value: unknown, max: number) {
  return typeof value === 'string' && value.trim().length <= max ? value.trim() : ''
}

const loginAttempts = new Map<string, { count: number; until: number }>()
function login(id: string, pin: unknown) {
  if (typeof pin !== 'string' || !/^\d{5}$/.test(pin)) throw workerError(401, 'Неверный ПИН-код.')
  const now = Date.now()
  const key = id || 'locked-screen'
  const previous = loginAttempts.get(key)
  const attempt = previous && previous.until > now ? previous : { count: 0, until: now + 60_000 }
  if (attempt.count >= 5) throw workerError(429, 'Слишком много попыток. Повторите через минуту.')
  const rows = id ? (db.prepare(q.findWorker).all({ id }) as Credentials[]) : candidates() as Credentials[]
  if (rows.length || !id) loginAttempts.set(key, { ...attempt, count: attempt.count + 1 })
  const matches = rows.filter(row => matchesPin(row, pin))
  if (matches.length !== 1) throw workerError(401, 'ПИН-код не подошёл. Если коды сотрудников совпадают, попросите администратора сменить код.')
  const row = matches[0]!
  loginAttempts.delete(key)
  const token = randomBytes(32).toString('hex')
  db.prepare(q.pruneWorkerSessions).run({ now })
  db.prepare(q.openWorkerSession).run({ id: row.id, hash: row.pin_hash, token, expires: now + 12 * 60 * 60 * 1000 })
  return { token, profile: employee(row) }
}

export function workerRequest(path: string, method: string, body: Record<string, unknown>, token?: string, query: Record<string, unknown> = {}) {
  if (path === 'session' && method === 'DELETE') {
    if (token) db.prepare(q.closeWorkerSession).run({ token })
    return { success: true }
  }
  const active = currentWorker(token)
  if (path === 'owner-pin' && method === 'POST') return ownerPinRequest(body, !!active)
  if (path === 'session' && method === 'GET') return active
  if (path === 'session' && method === 'POST') {
    if (active) throw workerError(409, 'Сначала выйдите из текущего сеанса.')
    const id = text(body.id, 100)
    if ('id' in body && !id) throw workerError(400, 'Выберите сотрудника.')
    return login(id, body.pin)
  }
  const requestedRight = method === 'PATCH' ? 'workers.edit' : method === 'DELETE' ? 'workers.delete' : 'workers'
  if (active && (path.endsWith('/permissions') || !permits(active.permissions, requestedRight))) {
    throw workerError(403, 'У вас нет прав для этого действия.')
  }
  if (!path && method === 'GET') return (db.prepare(q.listWorkers).all() as WorkerRow[]).map(employee)

  const [id, action] = path.split('/')
  if (id && !(db.prepare(q.findWorker).get({ id }))) throw workerError(404, 'Сотрудник не найден.')
  if (action === 'sales' && method === 'GET') {
    const date = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : ''
    const rows = db.prepare(q.workerSales).all({ id, from: date(query.from), to: date(query.to), ...resourceParameters(active?.resources) }) as (Omit<WorkerSale,'lines'> & { lines: string })[]
    return rows.map(row => ({ ...row, lines: JSON.parse(row.lines) }))
  }
  if (action === 'permissions' && method === 'PATCH') {
    const permissions = body.permissions
    if (!Array.isArray(permissions) || !permissions.every(p => rights.includes(p as Right))) throw workerError(400, 'Проверьте права доступа.')
    db.prepare(q.workerRights).run({ id, permissions: JSON.stringify([...new Set(permissions)]) })
    return { success: true }
  }
  if (id && !action && method === 'DELETE') {
    db.prepare(q.deleteWorker).run({ id })
    loginAttempts.delete(id)
    return { success: true }
  }
  if ((!path && method === 'POST') || (id && !action && method === 'PATCH')) {
    const name = text(body.name, 100), role = text(body.role, 80), phone = text(body.phone, 32)
    const pin = body.pin
    if (id && pin && active) throw workerError(403, 'ПИН-код может менять администратор.')
    if (!name || !role || !/\d/.test(phone) || ((!id || pin) && (typeof pin !== 'string' || !/^\d{5}$/.test(pin)))) {
      throw workerError(400, 'Проверьте имя, роль, телефон и ПИН-код из пяти цифр.')
    }
    const salt = typeof pin === 'string' && pin ? randomBytes(16) : null
    const hash = salt ? pinHash(pin as string, salt).toString('hex') : null
    const workerId = id || crypto.randomUUID()
    db.transaction(() => {
      if (hash) assertNotOwnerPin(pin as string)
      if (hash && candidates(id).some(row => matchesPin(row, pin as string))) {
        throw workerError(409, 'Этот ПИН-код уже используется другим сотрудником.')
      }
      db.prepare(id ? q.editWorker : q.createWorker).run({ id: workerId, name, role, phone, salt: salt?.toString('hex') ?? null, hash })
      const resources = readEmployeeResources(body.resources, !active)
      if (resources) saveEmployeeResources(workerId, resources)
      if (id && hash) db.prepare(q.revokeWorkerSessions).run({ id })
    }).immediate()
    return { id: workerId }
  }
  throw workerError(404, 'Маршрут не найден.')
}
