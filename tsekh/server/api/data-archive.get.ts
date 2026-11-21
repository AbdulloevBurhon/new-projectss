import { exportDatabase, exportTelegramSnapshot, exportTelegramSummary } from '../services/archive/archive.service'

export default defineEventHandler(event => {
  setHeader(event, 'Cache-Control', 'no-store')
  const { reports: format, start, previous, end, backup } = getQuery(event)
  if (format === 'telegram-text') {
    const iso = (value: unknown): value is string => typeof value === 'string'
      && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value))
    if (iso(start) && iso(previous) && iso(end) && previous < start && start < end) {
      return exportTelegramSummary(start, previous, end, backup === '1')
    }
    return exportTelegramSummary(undefined, undefined, undefined, backup === '1')
  }
  return format === 'telegram' ? exportTelegramSnapshot() : exportDatabase()
})
