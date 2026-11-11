import type { Env } from '../types/env'
import { adminKey, body, digest, id, isAdmin, isProduct, issueSession, json, now, secureEquals, validVersion, type LicenseRow, type ProductId } from '../services/runtime'
import { findLicenseById, findLicenseForProduct } from '../repositories/licenseRepository'

export async function adminRequest(request: Request, env: Env, path: string): Promise<Response> {
  if (path === '/api/v1/admin/auth/login' && request.method === 'POST') {
    const input = await body<{ key?: string }>(request)
    if (!adminKey(env) || !secureEquals(input.key || '', adminKey(env))) return json({ error: 'Неверный ключ администратора.' }, 401)
    return json({ token: await issueSession(env) })
  }
  if (!await isAdmin(request, env)) return json({ error: 'Сессия администратора истекла. Войдите снова.' }, 401)
  if (path === '/api/v1/admin/overview' && request.method === 'GET') {
    const [requests, licenses, releases] = await Promise.all([
      env.DB.prepare('SELECT id, device_id, app_version, status, requested_at, product_id FROM activation_requests ORDER BY requested_at DESC LIMIT 500').all(),
      env.DB.prepare("SELECT l.*, (SELECT COUNT(*) FROM messages m WHERE m.license_id = l.id AND m.sender = 'client' AND m.read_at IS NULL) AS feedback_count FROM product_licenses l ORDER BY activated_at DESC").all(),
      env.DB.prepare('SELECT product_id, version, notes, file_name, sha256, published_at, published FROM releases ORDER BY published_at DESC LIMIT 200').all(),
    ])
    return json({ requests: requests.results, licenses: licenses.results, releases: releases.results })
  }
  const decide = path.match(/^\/api\/v1\/admin\/requests\/([^/]+)\/(approve|reject)$/)
  if (decide && request.method === 'POST') {
    const requestId = decodeURIComponent(decide[1]!), action = decide[2]!
    const activation = await env.DB.prepare("SELECT * FROM activation_requests WHERE id = ? AND status = 'pending'").bind(requestId).first<{ id: string; device_id: string; app_version: string; product_id: ProductId }>()
    if (!activation) return json({ error: 'Заявка уже обработана или не найдена.' }, 404)
    if (action === 'reject') { await env.DB.prepare("UPDATE activation_requests SET status = 'rejected', resolved_at = ? WHERE id = ?").bind(now(), requestId).run(); return json({ ok: true }) }
    const input = await body<{ clientName?: string; years?: number; productId?: ProductId }>(request)
    const years = Number(input.years || 5)
    if (!String(input.clientName || '').trim() || !Number.isInteger(years) || years < 1 || years > 20 || !isProduct(input.productId || activation.product_id)) return json({ error: 'Проверьте имя, срок и направление.' }, 400)
    const licenseId = id(), activatedAt = now(), expiresAt = activatedAt + years * 365 * 24 * 60 * 60
    const productId = input.productId || activation.product_id
    const existing = await findLicenseForProduct(env, activation.device_id, productId)
    if (existing) {
      await env.DB.batch([
        env.DB.prepare("UPDATE product_licenses SET client_name = ?, activated_at = ?, expires_at = ?, status = 'active' WHERE id = ?").bind(input.clientName.trim(), activatedAt, expiresAt, existing.id),
        env.DB.prepare("UPDATE activation_requests SET status = 'approved', product_id = ?, client_name = ?, license_id = ?, resolved_at = ? WHERE id = ?").bind(productId, input.clientName.trim(), existing.id, now(), requestId),
      ])
    } else {
      await env.DB.batch([
        env.DB.prepare("INSERT INTO product_licenses (id, device_id, product_id, client_name, activated_at, expires_at, status) VALUES (?, ?, ?, ?, ?, ?, 'active')").bind(licenseId, activation.device_id, productId, input.clientName.trim(), activatedAt, expiresAt),
        env.DB.prepare("UPDATE activation_requests SET status = 'approved', product_id = ?, client_name = ?, license_id = ?, resolved_at = ? WHERE id = ?").bind(productId, input.clientName.trim(), licenseId, now(), requestId),
      ])
    }
    return json({ ok: true })
  }
  const nameMatch = path.match(/^\/api\/v1\/admin\/licenses\/([^/]+)\/name$/)
  if (nameMatch && request.method === 'PATCH') {
    const input = await body<{ clientName?: string }>(request), name = String(input.clientName || '').trim()
    if (!name || name.length > 120) return json({ error: 'Имя должно содержать 1–120 символов.' }, 400)
    await env.DB.prepare('UPDATE product_licenses SET client_name = ? WHERE id = ?').bind(name, decodeURIComponent(nameMatch[1]!)).run(); return json({ ok: true })
  }
  const termMatch = path.match(/^\/api\/v1\/admin\/licenses\/([^/]+)\/term$/)
  if (termMatch && request.method === 'PATCH') {
    const input = await body<{ expiresAt?: number }>(request), expiry = Number(input.expiresAt)
    if (!Number.isInteger(expiry) || expiry <= now()) return json({ error: 'Дата окончания должна быть в будущем.' }, 400)
    await env.DB.prepare('UPDATE product_licenses SET expires_at = ? WHERE id = ?').bind(expiry, decodeURIComponent(termMatch[1]!)).run(); return json({ ok: true })
  }
  const statusMatch = path.match(/^\/api\/v1\/admin\/licenses\/([^/]+)\/(activate|revoke)$/)
  if (statusMatch && request.method === 'POST') {
    await env.DB.prepare('UPDATE product_licenses SET status = ? WHERE id = ?').bind(statusMatch[2] === 'activate' ? 'active' : 'revoked', decodeURIComponent(statusMatch[1]!)).run(); return json({ ok: true })
  }
  const licenseDeleteMatch = path.match(/^\/api\/v1\/admin\/licenses\/([^/]+)$/)
  if (licenseDeleteMatch && request.method === 'DELETE') {
    const licenseId = decodeURIComponent(licenseDeleteMatch[1]!)
    if (!await findLicenseById(env, licenseId)) return json({ error: 'Клиент не найден.' }, 404)
    await env.DB.batch([
      env.DB.prepare('UPDATE activation_requests SET license_id = NULL WHERE license_id = ?').bind(licenseId),
      env.DB.prepare('DELETE FROM product_licenses WHERE id = ?').bind(licenseId),
    ])
    return json({ ok: true })
  }
  const pinMatch = path.match(/^\/api\/v1\/admin\/licenses\/([^/]+)\/reset-pin$/)
  if (pinMatch && request.method === 'POST') {
    const licenseId = decodeURIComponent(pinMatch[1]!), license = await findLicenseById(env, licenseId)
    if (!license || license.status !== 'active') return json({ error: 'Активный клиент не найден.' }, 404)
    const temporaryPin = String(crypto.getRandomValues(new Uint32Array(1))[0] % 9000 + 1000), expiresAt = now() + 3600
    await env.DB.prepare('UPDATE temporary_pins SET used_at = ? WHERE license_id = ? AND used_at IS NULL').bind(now(), licenseId).run()
    await env.DB.prepare('INSERT INTO temporary_pins (id, license_id, device_id, pin_hash, expires_at) VALUES (?, ?, ?, ?, ?)').bind(id(), licenseId, license.device_id, await digest(temporaryPin), expiresAt).run()
    return json({ temporaryPin, expiresAt })
  }
  if (path === '/api/v1/admin/messages' && request.method === 'GET') {
    await env.DB.prepare("UPDATE messages SET read_at = ? WHERE sender = 'client' AND read_at IS NULL").bind(now()).run()
    const result = await env.DB.prepare('SELECT m.*, l.client_name, l.device_id, l.product_id FROM messages m JOIN product_licenses l ON l.id = m.license_id ORDER BY m.created_at DESC LIMIT 500').all()
    return json({ messages: result.results })
  }
  const licenseMessagesMatch = path.match(/^\/api\/v1\/admin\/licenses\/([^/]+)\/messages$/)
  if (licenseMessagesMatch && request.method === 'GET') {
    const licenseId = decodeURIComponent(licenseMessagesMatch[1]!)
    const license = await findLicenseById(env, licenseId)
    if (!license) return json({ error: 'Клиент не найден.' }, 404)
    await env.DB.prepare("UPDATE messages SET read_at = ? WHERE license_id = ? AND sender = 'client' AND read_at IS NULL").bind(now(), licenseId).run()
    const result = await env.DB.prepare('SELECT m.*, l.client_name, l.device_id, l.product_id FROM messages m JOIN product_licenses l ON l.id = m.license_id WHERE m.license_id = ? ORDER BY m.created_at ASC LIMIT 500').bind(licenseId).all()
    return json({ messages: result.results })
  }
  const replyMatch = path.match(/^\/api\/v1\/admin\/messages\/([^/]+)\/reply$/)
  if (replyMatch && request.method === 'POST') {
    const parentId = decodeURIComponent(replyMatch[1]!), parent = await env.DB.prepare('SELECT license_id FROM messages WHERE id = ?').bind(parentId).first<{ license_id: string }>()
    const input = await body<{ message?: string }>(request), message = String(input.message || '').trim()
    if (!parent || !message || message.length > 1000) return json({ error: 'Сообщение не найдено или текст некорректен.' }, 400)
    await env.DB.prepare("INSERT INTO messages (id, license_id, sender, message, reply_to, created_at) VALUES (?, ?, 'admin', ?, ?, ?)").bind(id(), parent.license_id, message, parentId, now()).run(); return json({ ok: true })
  }
  const messageMatch = path.match(/^\/api\/v1\/admin\/messages\/([^/]+)$/)
  if (messageMatch && request.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM messages WHERE id = ?').bind(decodeURIComponent(messageMatch[1]!)).run(); return json({ ok: true })
  }
  if (path === '/api/v1/admin/releases' && request.method === 'POST') {
    const form = await request.formData(), productId = form.get('productId'), version = String(form.get('version') || ''), file = form.get('file'), notes = String(form.get('notes') || '').slice(0, 2000)
    if (!isProduct(productId) || !validVersion(version) || !(file instanceof File) || file.size < 1 || file.size > 25 * 1024 * 1024) return json({ error: 'Проверьте направление, версию и файл (до 25 МБ).' }, 400)
    const allClients = form.get('allClients') === 'true', licenseIds = String(form.get('licenseIds') || '').split(',').filter(Boolean)
    const eligible = await env.DB.prepare("SELECT id FROM product_licenses WHERE product_id = ? AND status = 'active' AND expires_at > ?").bind(productId, now()).all<{ id: string }>()
    const allowed = new Set(eligible.results.map(row => row.id))
    if (!allClients && (!licenseIds.length || licenseIds.some(value => !allowed.has(value)))) return json({ error: 'Выбраны неподходящие клиенты для этого направления.' }, 400)
    const objectKey = `${productId}/${version}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, '_')}`
    const data = await file.arrayBuffer(), sha256 = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', data))).map(byte => byte.toString(16).padStart(2, '0')).join('')
    await env.UPDATES.put(objectKey, data, { httpMetadata: { contentType: file.type || 'application/octet-stream' } })
    const statements = [env.DB.prepare('INSERT INTO releases (product_id, version, notes, file_key, file_name, object_key, sha256, published_at, published, all_clients) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)').bind(productId, version, notes, objectKey, file.name, objectKey, sha256, now(), allClients ? 1 : 0)]
    if (!allClients) for (const licenseId of licenseIds) statements.push(env.DB.prepare('INSERT INTO release_access (product_id, version, license_id) VALUES (?, ?, ?)').bind(productId, version, licenseId))
    try { await env.DB.batch(statements) } catch (error) { await env.UPDATES.delete(objectKey); throw error }
    return json({ ok: true, sha256 }, 201)
  }
  const releaseMatch = path.match(/^\/api\/v1\/admin\/releases\/([^/]+)\/([^/]+)\/toggle$/)
  if (releaseMatch && request.method === 'POST') {
    await env.DB.prepare('UPDATE releases SET published = CASE published WHEN 1 THEN 0 ELSE 1 END WHERE product_id = ? AND version = ?').bind(decodeURIComponent(releaseMatch[1]!), decodeURIComponent(releaseMatch[2]!)).run(); return json({ ok: true })
  }
  return json({ error: 'Маршрут API не найден.' }, 404)
}

