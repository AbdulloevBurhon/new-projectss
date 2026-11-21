import type { Env } from '../../../types'
import { json } from '../../../utils/http'
import { sendDeliveryPart, textParts, type DeliveryPart } from './message-parts'
import type { OutboxRecipient } from './outbox'
import { formatTelegramLowStock, formatTelegramSales, type Reconciliation } from '../../../../../../tsekh/endpoints/settings/telegram/telegram-reports'

type Job = { id: string; snapshot: Reconciliation; entries: Record<string, string>; day: string; previousDay: string; capturedAt: string }
const limit = 42 * 1024 * 1024

function reportDate(value: unknown) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(value + 'T12:00:00Z') : new Date(NaN)
}

export async function readOutboxJob(request: Request): Promise<Job | Response> {
  if (Number(request.headers.get('Content-Length')) > limit) return json({ error: 'Бэкап или отчёты превышают допустимый размер.' }, 413)
  let body: Job
  try {
    const raw = await request.text()
    if (new TextEncoder().encode(raw).byteLength > limit) return json({ error: 'Бэкап или отчёты превышают допустимый размер.' }, 413)
    body = JSON.parse(raw) as Job
  } catch { return json({ error: 'Не удалось прочитать комплект Telegram.' }, 400) }
  const { id, snapshot, entries, day, previousDay, capturedAt } = body ?? {}
  if (typeof id !== 'string' || !/^[a-f0-9]{32}$/.test(id) || !snapshot?.database || !snapshot.sales
    || !Array.isArray(snapshot.stock) || !entries || Array.isArray(entries) || typeof entries !== 'object'
    || Object.entries(entries).some(([key, value]) => key !== 'obshaya:data:tsekh:techcards' || typeof value !== 'string')
    || typeof capturedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(capturedAt)
    || !Number.isFinite(Date.parse(capturedAt))
    || reportDate(day).getTime() - reportDate(previousDay).getTime() !== 86_400_000) {
    return json({ error: 'Проверьте данные запланированной сверки.' }, 400)
  }
  return body
}

export async function deliverOutbox(env: Env, recipient: OutboxRecipient, job: Job) {
  const { id, day, previousDay, snapshot, entries } = job
  const keys = [recipient.license_id, recipient.ticket, id]
  const now = Date.now()
  let lease = now + 185_000
  const stateQuery = 'SELECT sent_files,lease_until FROM telegram_outbox_deliveries WHERE license_id=? AND ticket=? AND job_id=?'
  const state = await env.DB.prepare(stateQuery).bind(...keys).first<{ sent_files: number; lease_until: number }>()
  if (state?.sent_files === 3) return json({ delivered: true })
  if (state && state.lease_until > now) return json({ error: 'Комплект уже отправляется.' }, 409)
  const archive = new Blob([JSON.stringify({
    format: 'obshaya-archive', schemaVersion: 2, product: 'tsekh', createdAt: job.capturedAt,
    entries, database: snapshot.database,
  })], { type: 'application/json' })
  if (archive.size > 40 * 1024 * 1024) return json({ error: 'Бэкап превышает 40 МБ.' }, 413)
  const groups: DeliveryPart[][] = [
    [{ file: new File([archive], `tsekh-${day}.json`, { type: 'application/json' }), caption: 'Резервная копия «Цеха»' }],
    textParts(formatTelegramSales(snapshot, reportDate(day), reportDate(previousDay))),
    textParts(formatTelegramLowStock(snapshot.stock)),
  ]
  const claim = await env.DB.prepare(`INSERT INTO telegram_outbox_deliveries (license_id,ticket,job_id,lease_until,updated_at)
    SELECT ?,?,?,?,? FROM telegram_deliveries d JOIN app_licenses l ON l.id=d.license_id
    WHERE d.license_id=? AND d.ticket=? AND d.schedule_token_hash=? AND d.chat_id IS NOT NULL
    AND l.status='active' AND l.license_until>? AND l.cloud_archive_allowed=1
    AND COALESCE(l.telegram_interval_minutes,d.interval_minutes)>0
    ON CONFLICT(license_id,ticket,job_id) DO UPDATE SET lease_until=excluded.lease_until,updated_at=excluded.updated_at
    WHERE sent_files<3 AND lease_until<=? RETURNING sent_files,sent_parts`)
    .bind(...keys, lease, now, recipient.license_id, recipient.ticket, recipient.schedule_token_hash, new Date(now).toISOString(), now)
    .first<{ sent_files: number; sent_parts: number }>()
  if (!claim) return json({ error: 'Отправка уже началась или настройки доставки изменились.' }, 409)
  const release = () => env.DB.prepare(`UPDATE telegram_outbox_deliveries SET lease_until=0
    WHERE license_id=? AND ticket=? AND job_id=? AND lease_until=?`).bind(...keys, lease).run()
  try {
    for (const [index, group] of groups.entries()) {
      if (index < claim.sent_files) continue
      const start = index === claim.sent_files ? claim.sent_parts : 0
      for (let partIndex = start; partIndex < group.length; partIndex++) {
        const result = await sendDeliveryPart(env, recipient.chat_id, group[partIndex]!)
        if (!result.ok) return json({ error: 'Telegram не принял сообщение. Отправка продолжится при следующей попытке.' }, 502)
        const complete = partIndex + 1 === group.length
        const updated = Date.now()
        const nextLease = updated + 185_000
        const checkpoint = await env.DB.prepare(`UPDATE telegram_outbox_deliveries SET sent_files=?,sent_parts=?,updated_at=?,lease_until=?
          WHERE license_id=? AND ticket=? AND job_id=? AND lease_until=? RETURNING lease_until`)
          .bind(index + Number(complete), complete ? 0 : partIndex + 1, updated, nextLease, ...keys, lease).first()
        if (!checkpoint) return json({ error: 'Состояние отправки изменилось. Комплект будет проверен при следующей попытке.' }, 409)
        lease = nextLease
      }
    }
    await env.DB.batch([
      env.DB.prepare('UPDATE telegram_deliveries SET last_sent_at=? WHERE license_id=? AND ticket=?')
        .bind(Date.now(), recipient.license_id, recipient.ticket),
      env.DB.prepare('DELETE FROM telegram_outbox_deliveries WHERE license_id=? AND updated_at<?')
        .bind(recipient.license_id, now - 7 * 86_400_000),
    ])
    return json({ delivered: true })
  } catch {
    return json({ error: 'Связь с Telegram прервалась. Отправка продолжится при следующей попытке.' }, 502)
  } finally { await release() }
}
