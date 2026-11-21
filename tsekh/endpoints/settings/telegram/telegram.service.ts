import { ClientApiError, clientApi } from '@obshaya/contracts/client-api'
import { workshopArchiveFile } from '../archive/archive.service'
import { formatTelegramLowStock, formatTelegramSales, type Reconciliation } from './telegram-reports'

export interface DeliveryStatus {
  state: 'idle' | 'pending' | 'verified' | 'sending' | 'sent' | 'unknown'
  ticket?: string
  botUrl?: string
  phone?: string
  intervalMinutes?: number
  reportFormat?: number
}

const path = '/api/client/telegram'
export function telegramError(cause: unknown) {
  return cause instanceof ClientApiError && cause.status === 404
    ? 'Сервис Telegram ещё не подключён на сервере.'
    : (cause as { data?: { data?: { message?: string }; statusMessage?: string } } | undefined)?.data?.data?.message
      ?? (cause as { data?: { statusMessage?: string } } | undefined)?.data?.statusMessage
      ?? (cause instanceof Error ? cause.message : 'Не удалось выполнить запрос.')
}
export async function connectTelegramSchedule(base: string) {
  const { token } = await clientApi<{ token: string | null }>(base, `${path}/device`, {
    method: 'PUT', signal: AbortSignal.timeout(8000),
  }, 'tsekh')
  if (!token) return false
  await $fetch('/api/telegram-scheduled/config', { method: 'POST', body: { token } })
  return true
}
export const telegramStatus = (base: string) => clientApi<DeliveryStatus>(base, path, { signal: AbortSignal.timeout(8000) }, 'tsekh')
export const checkTelegramPhone = (base: string, phone: string) => clientApi<DeliveryStatus>(base, `${path}/verify`, {
  method: 'POST', body: JSON.stringify({ phone }), signal: AbortSignal.timeout(8000),
}, 'tsekh')

function reportDates(now = new Date()) {
  const year = now.getFullYear(), month = now.getMonth(), day = now.getDate()
  return { start: new Date(year, month, day), previous: new Date(year, month, day - 1), end: new Date(year, month, day + 1) }
}

const dayStamp = (date: Date) =>
  [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')

export const runDeviceTelegramSchedule = () => {
  const { start, previous, end } = reportDates()
  return $fetch<{ needsDevice?: boolean; intervalMinutes?: number; more?: boolean }>('/api/telegram-scheduled/run', {
    method: 'POST', timeout: 215_000, body: {
      start: start.toISOString(), previous: previous.toISOString(), end: end.toISOString(),
      day: dayStamp(start), previousDay: dayStamp(previous), online: navigator.onLine,
      techcards: localStorage.getItem('obshaya:data:tsekh:techcards'),
    },
  })
}

export async function sendTelegramReconciliation(base: string, ticket: string, reportFormat?: number) {
  const { start, previous, end } = reportDates()
  const summary = await $fetch<Reconciliation>('/api/data-archive', {
    query: { reports: 'telegram-text', backup: '1', start: start.toISOString(), previous: previous.toISOString(), end: end.toISOString() },
  })
  if (!summary.database) throw new Error('Не удалось получить бэкап. Обновите приложение «Цех».')
  const archive = workshopArchiveFile(summary.database)
  if (archive.blob.size > 40 * 1024 * 1024) throw new Error('Бэкап превышает 40 МБ.')
  const form = new FormData()
  form.set('ticket', ticket)
  const stamp = dayStamp(start)
  const sales = formatTelegramSales(summary, start, previous)
  const stock = formatTelegramLowStock(summary.stock)
  if (reportFormat === 3) {
    const reportFile = (text: string) => new Blob([text], { type: 'text/plain' })
    form.set('salesReport', reportFile(sales), 'tsekh-sales-' + stamp + '.txt')
    form.set('stockReport', reportFile(stock), 'tsekh-low-stock-' + stamp + '.txt')
  } else {
    form.set('text', (sales + '\n\n' + stock).slice(0, 4096))
  }
  form.set('archive', archive.blob, archive.fileName)
  return clientApi<DeliveryStatus>(base, `${path}/send`, {
    method: 'POST', body: form, signal: AbortSignal.timeout(210_000),
  }, 'tsekh')
}
