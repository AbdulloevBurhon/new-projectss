import { newestOperationFirst } from '~/features/tsekh/utils/operation-date'
import type { AccountMovement, Ledger, MovementKind } from '../types/accounts'

export const movementLabels: Record<MovementKind, string> = { income: 'Приход', expense: 'Списание' }

export function parseAmount(value: number | string, minimum: number, maximum = 1_000_000) {
  const number = Number(value)
  const cents = Math.round(number * 100)
  if ((typeof value === 'string' && !value.trim()) || !Number.isSafeInteger(cents) || number < minimum || number > maximum
    || Math.abs(number * 100 - cents) > 0.000001) {
    if (maximum === Infinity) throw new Error('Проверьте сумму оплаты. Укажите неотрицательную сумму с точностью до двух знаков.')
    throw new Error('Проверьте сумму. Допустимо до 1 000 000 сом с точностью до двух знаков.')
  }
  return cents
}

export function validDate(value: string) {
  const date = new Date(value)
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(date.getTime())
    && date.toISOString().slice(0, 10) === value
}

export function movementSign(kind: MovementKind) {
  return kind === 'income' ? 1 : -1
}

export function accountBalances(ledger: Ledger) {
  const balances = new Map(ledger.accounts.map(account => [account.id, account.openingCents]))
  for (const movement of ledger.movements) {
    const balance = balances.get(movement.accountId)
    if (balance !== undefined) balances.set(movement.accountId, balance + movementSign(movement.kind) * movement.cents)
  }
  return balances
}

export function newestFirst(movements: AccountMovement[]) {
  return [...movements].reverse().sort(newestOperationFirst)
}
