import type { Env, LicenseRow } from '../../../types'
import { sha256 } from '../../../utils/crypto'
import { json, notFound } from '../../../utils/http'
import { configured } from './bot'
import type { Delivery } from './delivery-state'
import { sendTelegramDelivery } from './send'
import { formatTelegramLowStock, formatTelegramSales, type Reconciliation } from '../../../../../../tsekh/endpoints/settings/telegram/telegram-reports'

type ScheduledDelivery = Delivery & { license_id: string; status: LicenseRow['status']; license_until: string; cloud_archive_allowed: number; telegram_interval_minutes: number | null }
type BackgroundPayload = { snapshot: Reconciliation; entries: Record<string, string>; day: string; previousDay: string }

function scheduleStatus(row: Delivery) {
  const state = row.state === 'sending' && row.expires_at <= Date.now() ? 'unknown' : row.state
  return { state, intervalMinutes: row.interval_minutes, nextAt: row.next_at, lastSentAt: row.last_sent_at, reportFormat: 3 }
}

export async function telegramBackground(request: Request, env: Env) {
  if (request.method !== 'GET' && request.method !== 'POST') return notFound()
  const token = request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1]
  if (!token) return json({ error: 'Расписание нужно подтвердить в настройках администратора.' }, 401)
  const tokenHash = await sha256(token)
  const row = await env.DB.prepare(`SELECT d.*,l.status,l.license_until,l.cloud_archive_allowed,l.telegram_interval_minutes
    FROM telegram_deliveries d JOIN app_licenses l ON l.id=d.license_id
    WHERE d.schedule_token_hash=? AND d.interval_minutes>0 AND d.chat_id IS NOT NULL AND l.product='tsekh'`)
    .bind(tokenHash).first<ScheduledDelivery>()
  if (!row) return json({ error: 'Расписание отключено или изменилось. Сохраните интервал в настройках.' }, 401)
  if (row.telegram_interval_minutes != null) return json({ error: 'Для расписания обновите «Цех».' }, 409)
  if (row.status !== 'active' || !(Date.parse(row.license_until) > Date.now()) || !row.cloud_archive_allowed) {
    return json({ error: 'Лицензия или разрешение на выгрузку недействительны.' }, 403)
  }
  if (!configured(env)) return json({ error: 'Telegram-бот не подключён.' }, 503)
  if (request.method === 'GET') return json(scheduleStatus(row))

  const now = Date.now()
  if (row.next_at == null || row.next_at > now || (row.state === 'sending' && row.expires_at > now)) {
    return json(scheduleStatus(row))
  }
  if (Number(request.headers.get('Content-Length')) > 42 * 1024 * 1024) {
    return json({ error: 'Бэкап или отчёты превышают допустимый размер.' }, 413)
  }

  let body: BackgroundPayload
  try { body = await request.json() as BackgroundPayload }
  catch { return json({ error: 'Не удалось прочитать запланированную сверку.' }, 400) }
  const { snapshot, entries, day, previousDay } = body ?? {}
  const date = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(value + 'T12:00:00Z') : new Date(NaN)
  const today = date(day)
  const yesterday = date(previousDay)
  if (!snapshot?.database || !snapshot.sales || !Array.isArray(snapshot.stock) || !entries || Array.isArray(entries)
    || typeof entries !== 'object' || Object.entries(entries).some(([key, value]) =>
      key !== 'obshaya:data:tsekh:techcards' || typeof value !== 'string')
    || !(yesterday.getTime() < today.getTime())) {
    return json({ error: 'Проверьте данные запланированной сверки.' }, 400)
  }

  const archive = new Blob([JSON.stringify({
    format: 'obshaya-archive', schemaVersion: 2, product: 'tsekh', createdAt: new Date().toISOString(),
    entries, database: snapshot.database,
  })], { type: 'application/json' })
  const form = new FormData()
  form.set('ticket', row.ticket)
  form.set('archive', archive, `tsekh-${day}.json`)
  form.set('salesReport', new Blob([formatTelegramSales(snapshot, today, yesterday)], { type: 'text/plain' }), `tsekh-sales-${day}.txt`)
  form.set('stockReport', new Blob([formatTelegramLowStock(snapshot.stock)], { type: 'text/plain' }), `tsekh-low-stock-${day}.txt`)
  return sendTelegramDelivery(new Request(request.url, { method: 'POST', body: form }), env, row.license_id, row, tokenHash)
}
