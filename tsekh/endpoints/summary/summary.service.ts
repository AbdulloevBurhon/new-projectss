export type SummaryPeriod = 1 | 7 | 30
export type SummaryDay = { start: string; count: number; total: number; paid: number }

export function summaryBoundaries(period: SummaryPeriod, now = new Date()) {
  const year = now.getFullYear(), month = now.getMonth(), day = now.getDate()
  return Array.from({ length: period + 1 }, (_, index) => new Date(year, month, day - period + 1 + index))
}

export function getSummary(days: Date[], signal?: AbortSignal) {
  return $fetch<SummaryDay[]>('/api/summary', {
    signal,
    query: { boundaries: days.map(day => day.toISOString()).join(',') },
  })
}
