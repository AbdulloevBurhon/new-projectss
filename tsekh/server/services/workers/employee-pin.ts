import { pbkdf2Sync, timingSafeEqual } from 'node:crypto'
import db from '../../database/accounts/accounts.database'
import q from '../../database/sales/queries'

type PinHash = { salt: string; pin_hash: string }

export const pinHash = (pin: string, salt: Buffer) => pbkdf2Sync(pin, salt, 600_000, 32, 'sha256')

export function matchesPin(row: PinHash, pin: string) {
  return timingSafeEqual(pinHash(pin, Buffer.from(row.salt, 'hex')), Buffer.from(row.pin_hash, 'hex'))
}

export const candidates = (except = '') => db.prepare(q.workerPinCandidates).all({ except }) as PinHash[]
