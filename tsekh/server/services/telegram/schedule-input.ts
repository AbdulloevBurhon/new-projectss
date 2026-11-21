const dayMs = 86_400_000
const iso = (value: unknown): value is string => typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value))
const date = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value))

export function readScheduleInput(input: Record<string, unknown>, now: number) {
  const { start, previous, end, day, previousDay, techcards, online } = input ?? {}
  if (!iso(start) || !iso(previous) || !iso(end) || previous >= start || start >= end
    || !date(day) || !date(previousDay) || Date.parse(day) - Date.parse(previousDay) !== dayMs
    || Math.abs(Date.parse(day) - now) > 2 * dayMs || typeof online !== 'boolean'
    || (techcards != null && (typeof techcards !== 'string' || techcards.length > 10_000_000))) {
    throw createError({ statusCode: 400, statusMessage: 'Проверьте данные запланированной сверки.' })
  }
  const cutoff = new Date(Date.parse(day) - 2 * dayMs).toISOString().slice(0, 10)
  const entries = typeof techcards === 'string' ? { 'obshaya:data:tsekh:techcards': techcards } : {}
  return { start, previous, end, day, previousDay, entries, cutoff, online }
}
