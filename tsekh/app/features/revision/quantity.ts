import type { RevisionRow } from '../../../endpoints/revision/service'

export const countUnit = (row: RevisionRow) => row.contentUnit ?? row.unit
const format = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 9 })
export const displayQuantity = (row: RevisionRow, base: number) => {
  const value = base * row.factor
  return ['шт', 'уп'].includes(countUnit(row)) && Math.abs(value - Math.round(value)) < 0.000001
    ? Math.round(value) : Number(value.toFixed(9))
}
export const quantity = (row: RevisionRow, base: number | null) =>
  base == null ? '—' : `${format.format(displayQuantity(row, base))} ${countUnit(row)}`
export const difference = (row: RevisionRow) =>
  row.book == null || row.actual == null ? null : Number((row.actual - row.book).toFixed(9))
