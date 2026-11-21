import db from '../../database/accounts/accounts.database'
import q from '../../database/sales/queries'
import type { EmployeeResourceAccess } from '../../../endpoints/workers/types'

export function resourceParameters(scope?: EmployeeResourceAccess) {
  return {
    allowedWarehouses: scope?.warehouses ? JSON.stringify(scope.warehouses) : null,
    allowedAccounts: scope?.accounts ? JSON.stringify(scope.accounts) : null,
  }
}

export function loadEmployeeResources(id: string): EmployeeResourceAccess {
  const row = db.prepare(q.getWorkerResources).get({ id }) as Record<'warehouses' | 'accounts', string | null> | undefined
  return { warehouses: row?.warehouses ? JSON.parse(row.warehouses) : null, accounts: row?.accounts ? JSON.parse(row.accounts) : null }
}

export function readEmployeeResources(value: unknown, owner: boolean) {
  if (value === undefined) return null
  const fail = (statusCode: number, message: string): never => {
    throw createError({ statusCode, message, data: { message } })
  }
  if (!owner) fail(403, 'Доступ к складам и счетам выдаёт администратор.')
  const input = value as Partial<EmployeeResourceAccess> | null
  if (!input || typeof input !== 'object' || Array.isArray(input)
    || Object.keys(input).some(key => key !== 'warehouses' && key !== 'accounts')) {
    return fail(400, 'Проверьте выбранные склады и счета.')
  }
  const read = (ids: unknown, key: 'warehouses' | 'accounts') => {
    if (ids === undefined) return undefined
    if (!Array.isArray(ids) || !ids.every(id => typeof id === 'string' && id.length > 0 && id.length <= 200)) {
      return fail(400, 'Проверьте выбранные склады и счета.')
    }
    const available = new Set((db.prepare(q[key]).all() as { id: string }[]).map(row => row.id))
    if (ids.some(id => !available.has(id))) return fail(409, 'Один из выбранных складов или счетов недоступен.')
    return JSON.stringify([...new Set(ids)])
  }
  return { warehouses: read(input.warehouses, 'warehouses'), accounts: read(input.accounts, 'accounts') }
}

export function saveEmployeeResources(id: string, access: NonNullable<ReturnType<typeof readEmployeeResources>>) {
  const old = db.prepare(q.getWorkerResources).get({ id }) as Record<'warehouses' | 'accounts', string | null> | undefined
  db.prepare(q.saveWorkerResources).run({ id,
    warehouses: access.warehouses ?? old?.warehouses ?? null, accounts: access.accounts ?? old?.accounts ?? null,
  })
}
