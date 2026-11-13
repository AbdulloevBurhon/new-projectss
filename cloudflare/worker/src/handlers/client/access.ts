import type { Env, ProductId } from '../../types'
import { sha256 } from '../../utils/crypto'
import { findClientLicense } from '../../services/client-license'
import { json, readJson } from '../../utils/http'

export async function verifyPin(request: Request, env: Env) {
  const body = await readJson<{ installationId: string; pin: string }>(request)
  const license = await env.DB.prepare('SELECT id, product, status, license_until, pin_hash, temporary_pin_hash, temporary_pin_expires_at FROM app_licenses WHERE installation_id=?')
    .bind(body.installationId).first<{ id: string; product: ProductId; status: string; license_until: string; pin_hash: string; temporary_pin_hash: string | null; temporary_pin_expires_at: string | null }>()
  if (!license || license.status !== 'active' || Date.parse(license.license_until) <= Date.now()) return json({ error: 'Лицензия не активна' }, 403)
  const hash = await sha256(body.pin)
  const permanent = hash === license.pin_hash
  const temporary = hash === license.temporary_pin_hash && !!license.temporary_pin_expires_at && Date.parse(license.temporary_pin_expires_at) > Date.now()
  return permanent || temporary ? json({ ok: true, temporary, temporaryExpiresAt: temporary ? license.temporary_pin_expires_at : null, product: license.product }) : json({ error: 'Неверный PIN-код' }, 401)
}

export async function changePin(request: Request, env: Env) {
  const result = await findClientLicense(request, env)
  if (!result.license) return result.response
  const body = await readJson<{ pin: string }>(request)
  if (!/^\d{5}$/.test(body.pin)) return json({ error: 'PIN-код должен содержать 5 цифр' }, 400)
  // findClientLicense уже проверил постоянный или временный PIN из заголовков.
  await env.DB.prepare('UPDATE app_licenses SET pin_hash=?, temporary_pin_hash=NULL, temporary_pin_expires_at=NULL, updated_at=CURRENT_TIMESTAMP WHERE id=?')
    .bind(await sha256(body.pin), result.license.id).run()
  return json({ ok: true })
}
