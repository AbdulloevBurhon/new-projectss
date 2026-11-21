import { randomBytes, randomUUID } from 'node:crypto'
import db from '../../database/accounts/accounts.database'
import q from '../../database/sales/queries'
import { candidates, matchesPin, pinHash } from './employee-pin'

type Guard = { kind: 'current' | 'pending'; salt: string; pin_hash: string; reservation: string; expires: number }
const guards = () => db.prepare(q.ownerPinGuards).all() as Guard[]
function fail(statusCode: number, message: string): never {
  throw createError({ statusCode, message, data: { message } })
}

export function assertNotOwnerPin(pin: string) {
  if (guards().some(row => matchesPin(row, pin))) fail(409, 'Этот ПИН-код используется администратором.')
}

export const ownerPinRequest = db.transaction((body: Record<string, unknown>, employee: boolean) => {
  if (employee) return fail(403, 'ПИН-код администратора меняет администратор.')
  const { action, pin, reservation } = body
  const rows = guards()
  const pending = rows.find(row => row.kind === 'pending')
  if (action === 'commit' || action === 'cancel') {
    if (typeof reservation !== 'string' || pending?.reservation !== reservation) {
      return fail(409, 'Состояние ПИН изменилось. Войдите снова с действующим кодом.')
    }
    if (action === 'commit') {
      const write = db.prepare(q.writeOwnerPinGuard)
      write.run({ kind: 'current', salt: pending.salt, hash: pending.pin_hash, reservation: '', expires: 0 })
    }
    db.prepare(q.clearOwnerPinGuard).run({ reservation })
    return { ok: true }
  }

  if ((action !== 'sync' && action !== 'initialize' && action !== 'reserve') || typeof pin !== 'string' || !/^\d{5}$/.test(pin)) {
    return fail(400, 'ПИН-код должен содержать пять цифр.')
  }
  const now = Date.now()
  const write = db.prepare(q.writeOwnerPinGuard)
  if (action === 'sync' || action === 'initialize') {
    const current = rows.find(row => row.kind === 'current')
    if (action === 'initialize' && (current || pending)) return { ok: true }
    if (!current || !matchesPin(current, pin)) {
      const salt = randomBytes(16)
      write.run({ kind: 'current', salt: salt.toString('hex'), hash: pinHash(pin, salt).toString('hex'), reservation: '', expires: 0 })
    }
    if (pending && (pending.expires <= now || matchesPin(pending, pin))) {
      db.prepare(q.clearOwnerPinGuard).run({ reservation: pending.reservation })
    }
    return { ok: true }
  }

  if (pending) return fail(409, 'Предыдущая смена ПИН ещё не подтверждена. Войдите заново с действующим кодом.')
  if (candidates().some(row => matchesPin(row, pin))) return fail(409, 'Этот ПИН-код уже используется сотрудником.')
  const salt = randomBytes(16)
  const id = randomUUID()
  write.run({ kind: 'pending', salt: salt.toString('hex'), hash: pinHash(pin, salt).toString('hex'), reservation: id, expires: now + 60_000 })
  return { reservation: id }
}).immediate
