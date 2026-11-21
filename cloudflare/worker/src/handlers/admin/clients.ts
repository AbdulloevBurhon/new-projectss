import type { Env, LicenseRow } from '../../types'
import { createId, randomPin, sha256 } from '../../utils/crypto'
import { json, readJson } from '../../utils/http'
import { isTelegramInterval } from '@obshaya/contracts/telegram-schedule'

interface ClientPatch { clientName?: string; licenseUntil?: string; status?: 'active' | 'disabled'; cloudArchiveAllowed?: boolean; telegramIntervalMinutes?: number }

export async function handleClients(request: Request, env: Env, id?: string, action?: string) {
  if (!id && request.method === 'GET') {
    const result = await env.DB.prepare(`SELECT l.id, l.client_name AS clientName, l.product AS productId,
      l.installation_id AS installationId, l.license_from AS licenseFrom, l.license_until AS licenseUntil,
      l.cloud_archive_allowed AS cloudArchiveAllowed,
      coalesce(l.telegram_interval_minutes, t.interval_minutes, 0) AS telegramIntervalMinutes,
      CASE WHEN l.status='active' AND l.license_until<=? THEN 'expired' ELSE l.status END AS status,
      l.current_version AS currentVersion, l.updated_at AS updatedAt,
      (SELECT COUNT(*) FROM app_messages m WHERE m.license_id=l.id AND m.sender='client' AND m.status='sent') AS unreadMessages
      FROM app_licenses l LEFT JOIN telegram_deliveries t ON t.license_id=l.id
      WHERE l.status != 'removed' ORDER BY l.updated_at DESC`).bind(new Date().toISOString()).all()
    return json(result.results)
  }
  if (!id) return json({ error: 'Не указан клиент' }, 400)
  if (action === 'updates' && request.method === 'GET') {
    const result = await env.DB.prepare(`SELECT u.version, r.installed_at AS installedAt FROM app_update_receipts r
      JOIN app_updates u ON u.id=r.update_id WHERE r.license_id=? AND r.installed_at IS NOT NULL ORDER BY r.installed_at`)
      .bind(id).all<{ version: string; installedAt: string }>()
    let previous = ''
    return json(result.results.map(row => {
      const change = { date: row.installedAt, from: previous, to: row.version }
      previous = row.version
      return change
    }))
  }
  if (action === 'temporary-pin' && request.method === 'POST') {
    const pin = randomPin()
    const expires = new Date(Date.now() + 3600000).toISOString()
    const result = await env.DB.prepare(`UPDATE app_licenses SET temporary_pin_hash=?, temporary_pin_expires_at=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=? AND status='active' AND license_until>?`).bind(await sha256(pin), expires, id, new Date().toISOString()).run()
    if (!result.meta.changes) return json({ error: 'Активный клиент не найден' }, 404)
    return json({ pin, expiresAt: expires })
  }
  if (action === 'login-pin' && request.method === 'POST') {
    const pin = randomPin()
    const result = await env.DB.prepare(`UPDATE app_licenses SET pin_hash=?, initial_pin=?, temporary_pin_hash=NULL,
      temporary_pin_expires_at=NULL, updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='active' AND license_until>?`)
      .bind(await sha256(pin), pin, id, new Date().toISOString()).run()
    if (!result.meta.changes) return json({ error: 'Активный клиент не найден' }, 404)
    return json({ pin })
  }
  if (request.method === 'PATCH') {
    const body = await readJson<ClientPatch>(request)
    if (!body) return json({ error: 'Нет допустимых изменений' }, 400)
    const fields: string[] = []; const values: unknown[] = []
    if (body.clientName?.trim()) { fields.push('client_name=?'); values.push(body.clientName.trim()) }
    if (body.licenseUntil && !Number.isNaN(Date.parse(body.licenseUntil))) { fields.push('license_until=?'); values.push(body.licenseUntil) }
    if (typeof body.cloudArchiveAllowed === 'boolean') { fields.push('cloud_archive_allowed=?'); values.push(body.cloudArchiveAllowed ? 1 : 0) }
    const interval = body.telegramIntervalMinutes
    if (interval !== undefined) {
      if (!isTelegramInterval(interval)) return json({ error: 'Укажите интервал от 0 до 10 080 минут.' }, 400)
      fields.push('telegram_interval_minutes=?')
      values.push(interval)
    }
    if (body.status && ['active', 'disabled'].includes(body.status)) {
      fields.push(body.status === 'disabled' ? 'status=?, initial_pin=NULL' : 'status=?')
      values.push(body.status)
    }
    if (!fields.length) return json({ error: 'Нет допустимых изменений' }, 400)
    fields.push('updated_at=CURRENT_TIMESTAMP'); values.push(id)
    const workshopOnly = interval === undefined ? '' : " AND product='tsekh'"
    const result = await env.DB.prepare(`UPDATE app_licenses SET ${fields.join(', ')} WHERE id=? AND status!='removed'${workshopOnly}`).bind(...values).run()
    return result.meta.changes ? json({ ok: true }) : json({ error: 'Клиент не найден' }, 404)
  }
  if (request.method === 'DELETE') {
    const result = await env.DB.prepare("UPDATE app_licenses SET status='removed', initial_pin=NULL, updated_at=CURRENT_TIMESTAMP WHERE id=? AND status!='removed'").bind(id).run()
    return result.meta.changes ? json({ ok: true }) : json({ error: 'Клиент не найден' }, 404)
  }
  return json({ error: 'Метод не поддерживается' }, 405)
}
