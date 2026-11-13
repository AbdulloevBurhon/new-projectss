import type { Env, ProductId } from '../../types'
import { createId } from '../../utils/crypto'
import { json, readJson } from '../../utils/http'

interface ActivationBody { installationId: string; product: ProductId; clientName?: string; version?: string }

export async function handleActivation(request: Request, env: Env, installationId?: string) {
  if (request.method === 'POST' && !installationId) {
    const body = await readJson<ActivationBody>(request)
    if (!body.installationId || !['tsekh', 'shawarma'].includes(body.product)) return json({ error: 'Укажите установку и направление' }, 400)
    const active = await env.DB.prepare("SELECT id FROM app_licenses WHERE installation_id=? AND status='active' AND license_until>?")
      .bind(body.installationId, new Date().toISOString()).first<{ id: string }>()
    if (active) return json({ status: 'approved', licenseId: active.id })
    const pending = await env.DB.prepare("SELECT id FROM app_activation_requests WHERE installation_id=? AND status='pending'").bind(body.installationId).first<{ id: string }>()
    if (pending) return json({ id: pending.id, status: 'pending' })
    const id = createId()
    await env.DB.prepare('INSERT INTO app_activation_requests (id, installation_id, product, client_name, app_version) VALUES (?, ?, ?, ?, ?)')
      .bind(id, body.installationId, body.product, body.clientName?.trim().slice(0, 100) ?? '', body.version?.trim().slice(0, 32) ?? '').run()
    return json({ id, status: 'pending' }, 201)
  }
  if (installationId && request.method === 'POST') {
    await env.DB.prepare('UPDATE app_licenses SET initial_pin=NULL WHERE installation_id=?').bind(installationId).run()
    return json({ ok: true })
  }
  if (installationId && request.method === 'GET') {
    const row = await env.DB.prepare(`SELECT r.status AS requestStatus, r.product AS productId, l.id AS licenseId,
      CASE WHEN l.status='active' AND l.license_until<=? THEN 'expired' ELSE l.status END AS licenseStatus,
      l.license_until AS licenseUntil,
      CASE WHEN l.status='active' AND l.license_until>? THEN l.initial_pin ELSE NULL END AS initialPin
      FROM app_activation_requests r
      LEFT JOIN app_licenses l ON l.installation_id=r.installation_id
      WHERE r.installation_id=? ORDER BY r.created_at DESC LIMIT 1`)
      .bind(new Date().toISOString(), new Date().toISOString(), installationId).first()
    return row ? json(row) : json({ error: 'Заявка не найдена' }, 404)
  }
  return json({ error: 'Маршрут активации не найден' }, 404)
}
