import type { Env } from '../../types'
import { findClientLicense } from '../../services/client-license'
import { json, notFound, readJson } from '../../utils/http'
import { configured, phoneDigits } from './telegram/bot'
import { publicDelivery, type Delivery } from './telegram/delivery-state'
import { sendTelegramDelivery } from './telegram/send'
import { telegramBackground } from './telegram/background'
import { telegramOutbox, telegramDeviceToken } from './telegram/outbox'

export { telegramWebhook } from './telegram/webhook'

export async function telegramClient(request: Request, env: Env, action?: string) {
  if (action === 'background') return telegramBackground(request, env)
  if (action === 'outbox') return telegramOutbox(request, env)
  const auth = await findClientLicense(request, env)
  if (!auth.license) return auth.response
  if (auth.license.product !== 'tsekh' || auth.temporary) return json({ error: 'Войдите по постоянному PIN-коду «Цеха».' }, 403)
  if (!auth.license.cloud_archive_allowed) return json({ error: 'Администратор отключил отправку данных за пределы устройства.' }, 403)
  if (!configured(env)) return json({ error: 'На сервере ещё не подключён Telegram-бот.' }, 503)
  const id = auth.license.id
  const managed = auth.license.telegram_interval_minutes
  const find = () => env.DB.prepare('SELECT * FROM telegram_deliveries WHERE license_id=?').bind(id).first<Delivery>()
  if (!action && request.method === 'GET') {
    const row = await find()
    const intervalMinutes = managed ?? row?.interval_minutes ?? 0
    const approved = row?.last_sent_at && intervalMinutes ? { ...row, interval_minutes: intervalMinutes } : row
    return json({ ...publicDelivery(env, approved), intervalMinutes })
  }
  if (action === 'device' && request.method === 'PUT') return telegramDeviceToken(env, id)
  if (action === 'verify' && request.method === 'POST') {
    const phone = phoneDigits((await readJson<{ phone?: unknown }>(request))?.phone)
    if (!phone) return json({ error: 'Введите номер с кодом страны, например +992…' }, 400)
    const ticket = crypto.randomUUID().replace(/-/g, '')
    const now = Date.now()
    const expires = now + 15 * 60 * 1000
    const row = await env.DB.prepare(`INSERT INTO telegram_deliveries (license_id,ticket,phone,state,expires_at)
      VALUES (?,?,?,'pending',?) ON CONFLICT(license_id) DO UPDATE SET ticket=excluded.ticket,phone=excluded.phone,
      chat_id=NULL,state='pending',expires_at=excluded.expires_at,interval_minutes=0,next_at=NULL,last_sent_at=NULL,schedule_token_hash=NULL
      WHERE (?=0 OR (telegram_deliveries.interval_minutes=0 AND (? IS NULL OR telegram_deliveries.last_sent_at IS NULL)))
      AND (telegram_deliveries.state!='sending' OR telegram_deliveries.expires_at<=?) RETURNING *`)
      .bind(id, ticket, phone, expires, managed ?? null, managed ?? null, now).first<Delivery>()
    return row ? json({ ...publicDelivery(env, row), intervalMinutes: managed ?? 0 })
      : json({ error: 'Отключите текущее расписание или дождитесь завершения отправки.' }, 409)
  }
  if (action === 'schedule' && request.method === 'PUT') {
    return json({ error: 'Интервал устанавливается в операторской админке.' }, 403)
  }
  if (action !== 'send' || request.method !== 'POST') return notFound()
  const row = await find()
  if (managed != null && row?.interval_minutes) return json({ error: 'Для расписания обновите «Цех».' }, 409)
  return sendTelegramDelivery(request, env, id, row)
}
