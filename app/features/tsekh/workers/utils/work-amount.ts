import { validNumber } from '~/features/tsekh/warehouse/utils/format'
import type { WorkLineDraft, WorkRecord } from '../types/workers'

export const maxWorkQuantity = 1_000_000

export function workQuantity(value: number | string) {
  const count = Number(value)
  return Number.isInteger(count) && count >= 1 && count <= maxWorkQuantity ? count : undefined
}

export function workUnitCents(value: number | string) {
  const wage = Number(value)
  if (String(value).trim() && validNumber(wage, 100)) return Math.round(wage * 100)
}

export function workTotalCents(lines: WorkLineDraft[]) {
  let total = 0
  for (const line of lines) {
    const count = workQuantity(line.quantity)
    const cents = workUnitCents(line.wage)
    if (count === undefined || cents === undefined) return undefined
    total += count * cents
  }
  return Number.isSafeInteger(total) ? total : undefined
}

export function totalWorkQuantity(records: WorkRecord[]) {
  return records.reduce((sum, record) => sum + (record.quantity ?? 1), 0)
}
