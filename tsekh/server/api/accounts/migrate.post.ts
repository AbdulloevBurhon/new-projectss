import { migrateAccounts, type AccountRecord } from '../../services/accounts/accounts.service'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ accounts?: unknown }>(event)
  const rows = body?.accounts
  if (!Array.isArray(rows) || rows.length > 1000 || rows.some((row) => !validAccount(row))) {
    throw createError({ statusCode: 400, statusMessage: 'Некорректные сохранённые счета.' })
  }
  try {
    return { migrated: migrateAccounts(rows as AccountRecord[]) }
  } catch (error) {
    if (String(error).includes('UNIQUE')) {
      throw createError({ statusCode: 409, statusMessage: 'В сохранённых счетах есть повторяющиеся названия.' })
    }
    throw error
  }
})

function validAccount(value: unknown): value is AccountRecord {
  if (!value || typeof value !== 'object') return false
  const row = value as Partial<AccountRecord>
  return typeof row.id === 'string' && row.id.length > 0 && row.id.length <= 100
    && typeof row.name === 'string' && row.name.trim().length > 0 && row.name.trim().length <= 100
    && typeof row.amount === 'number' && Number.isFinite(row.amount) && row.amount >= 0
}
