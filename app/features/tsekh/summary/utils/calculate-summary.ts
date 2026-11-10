import { localDate } from '~/features/tsekh/warehouse/utils/format'
import type { SummaryPeriod, SummarySources } from '../types/summary'

export function calculateSummary(sources: SummarySources, { from, to }: SummaryPeriod) {
  const inPeriod = (date: string) => (!from || date >= from) && (!to || date <= to)
  const totals = { produced: 0, wagesCents: 0, salesCents: 0, receiptsCents: 0 }

  for (const worker of sources.workers) {
    for (const record of worker.records) {
      if (!inPeriod(record.date)) continue
      totals.produced += record.quantity ?? 1
      totals.wagesCents += record.wageCents
    }
  }

  for (const movement of sources.movements) {
    if (movement.sale && inPeriod(movement.date)) totals.salesCents += movement.cents
  }

  for (const receipt of sources.receipts) {
    if (!inPeriod(localDate(receipt.date))) continue
    for (const line of receipt.lines) totals.receiptsCents += Math.round(line.sum * 100)
  }

  return totals
}
