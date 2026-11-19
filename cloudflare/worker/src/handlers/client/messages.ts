import type { Env } from '../../types'
import { isProductId, type ProductId } from '@obshaya/contracts'
import { createId } from '../../utils/crypto'
import { findClientLicense } from '../../services/client-license'
import { json, readJson } from '../../utils/http'

export async function handleClientMessages(request: Request, env: Env) {
  const auth = await findClientLicense(request, env)
  if (!auth.license) return auth.response
  if (request.method === 'GET') {
    if (new URL(request.url).searchParams.get('peek') === '1') {
      const count = await env.DB.prepare("SELECT COUNT(*) AS unread FROM app_messages WHERE license_id=? AND sender='admin' AND status='sent'").bind(auth.license.id).first<{ unread: number }>()
      return json({ unread: count?.unread ?? 0 })
    }
    await env.DB.prepare("UPDATE app_messages SET status='read' WHERE license_id=? AND sender='admin'").bind(auth.license.id).run()
    const rows = await env.DB.prepare('SELECT id, sender, body, status, created_at AS createdAt FROM app_messages WHERE license_id=? ORDER BY created_at ASC')
      .bind(auth.license.id).all()
    return json(rows.results)
  }
  if (request.method === 'POST') {
    const body = await readJson<{ body: string }>(request)
    const text = body.body?.trim()
    if (!text || text.length > 1000) return json({ error: 'Сообщение должно содержать от 1 до 1000 символов' }, 400)
    const id = createId()
    await env.DB.prepare("INSERT INTO app_messages (id, license_id, sender, body) VALUES (?, ?, 'client', ?)").bind(id, auth.license.id, text).run()
    return json({ id, sender: 'client', body: text, status: 'sent', createdAt: new Date().toISOString() }, 201)
  }
  return json({ error: 'Метод не поддерживается' }, 405)
}

export async function handleClientSupport(request: Request, env: Env) {
  const body = await readJson<{ installationId: string; product: ProductId; body: string }>(request)
  const text = body.body?.trim()
  if (!body.installationId || !isProductId(body.product) || !text || text.length > 1000) return json({ error: 'Проверьте направление и текст сообщения (до 1000 символов)' }, 400)
  const license = await env.DB.prepare("SELECT id FROM app_licenses WHERE installation_id=? AND product=? AND (status='disabled' OR (status='active' AND license_until>?)) LIMIT 1")
    .bind(body.installationId, body.product, new Date().toISOString()).first<{ id: string }>()
  if (!license) return json({ error: 'Активная лицензия не найдена' }, 403)
  const id = createId()
  await env.DB.prepare("INSERT INTO app_messages (id, license_id, sender, body) VALUES (?, ?, 'client', ?)").bind(id, license.id, text).run()
  return json({ id, sender: 'client', body: text, status: 'sent', createdAt: new Date().toISOString() }, 201)
}

export async function handleActivationSupport(request: Request, env: Env) {
  const body = await readJson<{ installationId: string; product: ProductId; body: string }>(request)
  const text = body.body?.trim()
  if (!body.installationId || !isProductId(body.product) || !text || text.length > 1000) {
    return json({ error: 'Проверьте направление и текст сообщения (до 1000 символов)' }, 400)
  }
  const recent = await env.DB.prepare("SELECT COUNT(*) AS total FROM app_activation_messages WHERE installation_id=? AND created_at > datetime('now', '-10 minutes')")
    .bind(body.installationId).first<{ total: number }>()
  if ((recent?.total ?? 0) >= 5) return json({ error: 'Слишком много сообщений. Попробуйте позже.' }, 429)
  const id = createId()
  await env.DB.prepare('INSERT INTO app_activation_messages (id, installation_id, product, body) VALUES (?, ?, ?, ?)')
    .bind(id, body.installationId, body.product, text).run()
  return json({ id, status: 'sent' }, 201)
}
