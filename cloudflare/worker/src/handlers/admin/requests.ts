import type { Env, ProductId } from '../../types'
import { createId, randomPin, sha256 } from '../../utils/crypto'
import { json, readJson } from '../../utils/http'

interface DecisionBody { action: 'approve' | 'reject'; clientName?: string; licenseDays?: number }
const productName: Record<ProductId, string> = { tsekh: 'Цех', shawarma: 'Шаурма' }

export async function handleRequests(request: Request, env: Env, id?: string) {
  if (!id && request.method === 'GET') {
    const result = await env.DB.prepare(`SELECT id, installation_id AS installationId, product AS productId, client_name AS clientName,
      app_version AS appVersion, status, license_days AS licenseDays, created_at AS receivedAt FROM app_activation_requests
      WHERE status = 'pending' ORDER BY created_at DESC`).all()
    return json(result.results)
  }
  if (!id || request.method !== 'PATCH') return json({ error: 'Метод не поддерживается' }, 405)

  const body = await readJson<DecisionBody>(request)
  if (!['approve', 'reject'].includes(body.action)) return json({ error: 'Выберите решение по заявке' }, 400)
  const row = await env.DB.prepare('SELECT * FROM app_activation_requests WHERE id = ?').bind(id).first<Record<string, unknown>>()
  if (!row || row.status !== 'pending') return json({ error: 'Заявка уже обработана или не найдена' }, 404)

  if (body.action === 'reject') {
    await env.DB.prepare("UPDATE app_activation_requests SET status = 'rejected', decided_at = ? WHERE id = ?")
      .bind(new Date().toISOString(), id).run()
    return json({ ok: true, status: 'rejected' })
  }

  const licenseDays = Math.max(1, Math.min(3650, Math.floor(Number(body.licenseDays) || 365)))
  const pin = randomPin()
  const now = new Date()
  const until = new Date(now.getTime() + licenseDays * 86400000).toISOString()
  const licenseId = createId()
  const product = row.product as ProductId
  const name = body.clientName?.trim() || String(row.client_name || productName[product])
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO app_licenses (id, installation_id, product, client_name, license_from, license_until, pin_hash, initial_pin)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(installation_id) DO UPDATE SET product=excluded.product,
      client_name=excluded.client_name, status='active', license_from=excluded.license_from,
      license_until=excluded.license_until, pin_hash=excluded.pin_hash, temporary_pin_hash=NULL,
      temporary_pin_expires_at=NULL, initial_pin=excluded.initial_pin, updated_at=CURRENT_TIMESTAMP`)
      .bind(licenseId, row.installation_id, product, name, now.toISOString(), until, await sha256(pin), pin),
    env.DB.prepare("UPDATE app_activation_requests SET status='approved', client_name=?, license_days=?, decided_at=? WHERE id=?")
      .bind(name, licenseDays, now.toISOString(), id),
  ])
  return json({ ok: true, status: 'approved', client: name, product: productName[product], licenseUntil: until, initialPin: pin })
}
