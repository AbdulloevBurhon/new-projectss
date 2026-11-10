import type { Env } from '../types/env'
import { body, digest, id, isProduct, json, newerVersion, now, pathId, signLicense, validVersion, type ProductId } from '../services/runtime'
import { findActiveLicense } from '../repositories/licenseRepository'

export async function clientRequest(request: Request, env: Env, path: string): Promise<Response> {
  const method = request.method
  if (path === '/api/v1/activation/requests' && method === 'POST') {
    const input = await body<{ deviceId?: string; appVersion?: string; productId?: ProductId }>(request)
    if (!input.deviceId || input.deviceId.length > 160 || !isProduct(input.productId ?? 'tsekh')) return json({ error: 'Укажите устройство и направление.' }, 400)
    const productId = input.productId ?? 'tsekh'
    const pending = await env.DB.prepare("SELECT id FROM activation_requests WHERE device_id = ? AND product_id = ? AND status = 'pending' ORDER BY requested_at DESC LIMIT 1").bind(input.deviceId, productId).first<{ id: string }>()
    if (pending) return json({ requestId: pending.id, status: 'pending' })
    const requestId = id()
    await env.DB.prepare('INSERT INTO activation_requests (id, device_id, app_version, product_id, status, requested_at) VALUES (?, ?, ?, ?, ?, ?)').bind(requestId, input.deviceId, String(input.appVersion || '0.0.0').slice(0, 32), productId, 'pending', now()).run()
    return json({ requestId, status: 'pending' }, 201)
  }
  const requestId = pathId(path, '/api/v1/activation/requests/')
  if (requestId && method === 'GET') {
    const row = await env.DB.prepare('SELECT * FROM activation_requests WHERE id = ?').bind(requestId).first<{ id: string; status: string; device_id: string; license_id: string | null }>()
    if (!row) return json({ error: 'Заявка не найдена.' }, 404)
    if (row.status === 'approved') {
      const license = row.license_id ? await findActiveLicense(env, row.license_id, row.device_id) : null
      if (!license || license.status !== 'active' || license.expires_at <= now()) return json({ status: 'rejected' })
      return json({ status: 'approved', license: await signLicense(env, license) })
    }
    return json({ status: row.status })
  }
  if (path === '/api/v1/client/sync' && method === 'POST') {
    const input = await body<{ deviceId: string; licenseId: string }>(request)
    const license = await findActiveLicense(env, input.licenseId, input.deviceId)
    if (!license) return json({ error: 'Лицензия отключена или закончилась.' }, 403)
    return json({ license: await signLicense(env, license) })
  }
  if (path === '/api/v1/client/pin/redeem' && method === 'POST') {
    const input = await body<{ deviceId: string; pin: string }>(request)
    const attempts = await env.DB.prepare('SELECT attempt_count, window_started_at, blocked_until FROM pin_attempts WHERE device_id = ?').bind(input.deviceId).first<{ attempt_count: number; window_started_at: number; blocked_until: number }>()
    if (attempts && attempts.blocked_until > now()) return json({ error: 'Слишком много попыток. Повторите через 15 минут.' }, 429, { 'retry-after': String(attempts.blocked_until - now()) })
    const pinHash = await digest(input.pin || '')
    const pin = await env.DB.prepare('SELECT id, license_id FROM temporary_pins WHERE device_id = ? AND pin_hash = ? AND used_at IS NULL AND expires_at > ?').bind(input.deviceId, pinHash, now()).first<{ id: string; license_id: string }>()
    if (!pin || !await findActiveLicense(env, pin.license_id, input.deviceId)) {
      const currentTime = now(), insideWindow = !!attempts && attempts.window_started_at > currentTime - 900
      const count = insideWindow ? attempts!.attempt_count + 1 : 1
      const blockedUntil = count >= 6 ? currentTime + 900 : 0
      await env.DB.prepare('INSERT INTO pin_attempts (device_id, attempt_count, window_started_at, blocked_until) VALUES (?, ?, ?, ?) ON CONFLICT(device_id) DO UPDATE SET attempt_count = excluded.attempt_count, window_started_at = excluded.window_started_at, blocked_until = excluded.blocked_until').bind(input.deviceId, count, insideWindow ? attempts!.window_started_at : currentTime, blockedUntil).run()
      return json({ error: blockedUntil ? 'Слишком много попыток. Повторите через 15 минут.' : 'Временный PIN неверен или истёк.' }, blockedUntil ? 429 : 403, blockedUntil ? { 'retry-after': '900' } : {})
    }
    const claimed = await env.DB.prepare('UPDATE temporary_pins SET used_at = ? WHERE id = ? AND used_at IS NULL AND expires_at > ? RETURNING id').bind(now(), pin.id, now()).first<{ id: string }>()
    if (!claimed) return json({ error: 'Этот временный PIN уже использован или истёк.' }, 403)
    await env.DB.prepare('DELETE FROM pin_attempts WHERE device_id = ?').bind(input.deviceId).run()
    return json({ ok: true, forceChangePin: true })
  }
  if (path === '/api/v1/client/feedback' && method === 'POST') {
    const input = await body<{ deviceId: string; licenseId: string; message: string }>(request)
    if (!await findActiveLicense(env, input.licenseId, input.deviceId)) return json({ error: 'Лицензия недействительна.' }, 403)
    const message = String(input.message || '').trim()
    if (!message || message.length > 1000) return json({ error: 'Сообщение должно содержать от 1 до 1000 символов.' }, 400)
    const messageId = id()
    await env.DB.prepare("INSERT INTO messages (id, license_id, sender, message, created_at) VALUES (?, ?, 'client', ?, ?)").bind(messageId, input.licenseId, message, now()).run()
    return json({ ok: true, id: messageId }, 201)
  }
  if (path.startsWith('/api/v1/client/feedback') && method === 'GET') {
    const params = new URL(request.url).searchParams
    const licenseId = params.get('licenseId') || '', deviceId = params.get('deviceId') || ''
    if (!await findActiveLicense(env, licenseId, deviceId)) return json({ error: 'Лицензия недействительна.' }, 403)
    if (path.endsWith('/unread')) {
      const result = await env.DB.prepare("SELECT COUNT(*) AS count FROM messages WHERE license_id = ? AND sender = 'admin' AND read_at IS NULL").bind(licenseId).first<{ count: number }>()
      return json({ count: result?.count || 0 })
    }
    await env.DB.prepare("UPDATE messages SET read_at = ? WHERE license_id = ? AND sender = 'admin' AND read_at IS NULL").bind(now(), licenseId).run()
    const { results } = await env.DB.prepare('SELECT id, message, sender, reply_to, created_at, read_at FROM messages WHERE license_id = ? ORDER BY created_at ASC').bind(licenseId).all()
    return json({ messages: results })
  }
  if (path === '/api/v1/client/feedback/clear' && method === 'POST') {
    const input = await body<{ deviceId: string; licenseId: string }>(request)
    if (!await findActiveLicense(env, input.licenseId, input.deviceId)) return json({ error: 'Лицензия недействительна.' }, 403)
    await env.DB.prepare("DELETE FROM messages WHERE license_id = ? AND sender = 'admin'").bind(input.licenseId).run()
    return json({ ok: true })
  }
  if (path === '/api/v1/client/update/latest' && method === 'GET') {
    const params = new URL(request.url).searchParams
    const licenseId = params.get('licenseId') || '', deviceId = params.get('deviceId') || '', current = params.get('current') || ''
    const license = await findActiveLicense(env, licenseId, deviceId)
    if (!license) return json({ error: 'Лицензия недействительна.' }, 403)
    const release = await env.DB.prepare("SELECT r.* FROM releases r LEFT JOIN release_access a ON a.product_id = r.product_id AND a.version = r.version AND a.license_id = ? WHERE r.product_id = ? AND r.published = 1 AND (r.all_clients = 1 OR a.license_id IS NOT NULL) ORDER BY r.published_at DESC").bind(licenseId, license.product_id).first<{ version: string; notes: string; sha256: string; file_name: string }>()
    if (!release || !newerVersion(release.version, current)) return json({ updateAvailable: false })
    return json({ updateAvailable: true, version: release.version, notes: release.notes, sha256: release.sha256, fileName: release.file_name, downloadUrl: '/api/v1/client/update/download' })
  }
  if (path === '/api/v1/client/update/download' && method === 'GET') {
    const params = new URL(request.url).searchParams
    const licenseId = params.get('licenseId') || '', deviceId = params.get('deviceId') || ''
    const license = await findActiveLicense(env, licenseId, deviceId)
    if (!license) return json({ error: 'Лицензия недействительна.' }, 403)
    const release = await env.DB.prepare("SELECT r.object_key, r.file_name FROM releases r LEFT JOIN release_access a ON a.product_id = r.product_id AND a.version = r.version AND a.license_id = ? WHERE r.product_id = ? AND r.published = 1 AND (r.all_clients = 1 OR a.license_id IS NOT NULL) ORDER BY r.published_at DESC").bind(licenseId, license.product_id).first<{ object_key: string; file_name: string }>()
    if (!release) return json({ error: 'Обновление больше недоступно.' }, 404)
    const object = await env.UPDATES.get(release.object_key)
    if (!object) return json({ error: 'Файл обновления не найден.' }, 404)
    return new Response(object.body, { headers: { 'content-type': 'application/octet-stream', 'content-length': String(object.size), 'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(release.file_name)}`, 'cache-control': 'private, no-store' } })
  }
  return json({ error: 'Маршрут API не найден.' }, 404)
}

