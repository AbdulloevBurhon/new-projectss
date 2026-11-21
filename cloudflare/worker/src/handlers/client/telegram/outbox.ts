import type { Env, LicenseRow } from '../../../types'
import { sha256 } from '../../../utils/crypto'
import { json, notFound } from '../../../utils/http'
import { configured } from './bot'
import { deliverOutbox, readOutboxJob } from './outbox-delivery'

export type OutboxRecipient = {
  license_id: string; ticket: string; chat_id: string; intervalMinutes: number
  status: LicenseRow['status']; license_until: string; cloud_archive_allowed: number; schedule_token_hash: string
}

export async function telegramDeviceToken(env: Env, licenseId: string) {
  const row = await env.DB.prepare(`SELECT ticket FROM telegram_deliveries
    WHERE license_id=? AND chat_id IS NOT NULL AND (last_sent_at IS NOT NULL OR interval_minutes>0)`)
    .bind(licenseId).first<{ ticket: string }>()
  if (!row) return json({ token: null })
  const token = await sha256(`tsekh-outbox:${licenseId}:${row.ticket}:${env.TELEGRAM_WEBHOOK_SECRET}`)
  const update = await env.DB.prepare(`UPDATE telegram_deliveries SET schedule_token_hash=?
    WHERE license_id=? AND ticket=? AND chat_id IS NOT NULL`)
    .bind(await sha256(token), licenseId, row.ticket).run()
  return json({ token: update.meta.changes ? token : null })
}

export async function telegramOutbox(request: Request, env: Env) {
  if (request.method !== 'GET' && request.method !== 'POST') return notFound()
  const token = request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1]
  if (!token) return json({ error: 'Устройство не подключено к Telegram.' }, 401)
  const tokenHash = await sha256(token)
  const row = await env.DB.prepare(`SELECT d.license_id,d.ticket,d.chat_id,d.schedule_token_hash,
    COALESCE(l.telegram_interval_minutes,d.interval_minutes) AS intervalMinutes,l.status,l.license_until,l.cloud_archive_allowed
    FROM telegram_deliveries d JOIN app_licenses l ON l.id=d.license_id
    WHERE d.schedule_token_hash=? AND d.chat_id IS NOT NULL AND l.product='tsekh'
    AND (d.last_sent_at IS NOT NULL OR d.interval_minutes>0)`).bind(tokenHash).first<OutboxRecipient>()
  if (!row) return json({ error: 'Устройство не подключено к Telegram.' }, 401)
  if (row.status !== 'active' || !(Date.parse(row.license_until) > Date.now()) || !row.cloud_archive_allowed) {
    return json({ error: 'Лицензия или разрешение на выгрузку недействительны.' }, 403)
  }
  if (request.method === 'GET') return json({ intervalMinutes: row.intervalMinutes })
  if (!row.intervalMinutes) return json({ error: 'Расписание отключено в админке.' }, 409)
  if (!configured(env)) return json({ error: 'Telegram-бот не подключён.' }, 503)
  const job = await readOutboxJob(request)
  return job instanceof Response ? job : deliverOutbox(env, row, job)
}
