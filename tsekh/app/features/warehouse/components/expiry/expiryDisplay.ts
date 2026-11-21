import type { StockExpiryRow } from '../../../../../endpoints/warehouse/stock-receipts/expiry'

const day = 86_400_000
const plural = new Intl.PluralRules('ru')
const words: Record<string, string> = { one: 'день', few: 'дня', many: 'дней', other: 'дня' }

export const expiryFilters = [
  { id: 'all', label: 'Все сроки' }, { id: 'expired', label: 'Просрочено' },
  { id: 'today', label: 'Истекает сегодня' }, { id: '3', label: '1–3 дня' }, { id: '7', label: '4–7 дней' },
  { id: '30', label: '8–30 дней' }, { id: 'later', label: 'Больше 30 дней' }, { id: 'none', label: 'Без срока' },
]

export function expiryStatus(row: StockExpiryRow, today: Date) {
  if (!row.expiresOn) return { filter: 'none', label: 'Без срока', tone: 'text-muted-foreground' }
  const localDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  const days = Math.round((Date.parse(row.expiresOn) - localDay) / day)
  const duration = `${Math.abs(days)} ${words[plural.select(Math.abs(days))]}`
  if (days < 0) return { filter: 'expired', label: `Просрочено на ${duration}`, tone: 'text-destructive' }
  if (!days) return { filter: 'today', label: 'Истекает сегодня', tone: 'text-amber-800 dark:text-amber-300' }
  if (days <= 3) return { filter: '3', label: duration, tone: 'text-amber-800 dark:text-amber-300' }
  return { filter: days <= 7 ? '7' : days <= 30 ? '30' : 'later', label: duration, tone: 'text-foreground' }
}
