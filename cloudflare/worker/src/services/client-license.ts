import type { Env, LicenseRow } from '../types'
import { sha256 } from '../utils/crypto'
import { json } from '../utils/http'

type AuthenticatedLicense = LicenseRow & { pin_hash: string; temporary_pin_hash: string | null; temporary_pin_expires_at: string | null }
type ClientLicenseResult = { license: AuthenticatedLicense; temporary: boolean; response: null } | { license: null; temporary: false; response: Response }

export async function findClientLicense(request: Request, env: Env): Promise<ClientLicenseResult> {
  const installationId = request.headers.get('x-installation-id')
  const pin = request.headers.get('x-client-pin')
  if (!installationId || !pin) return { license: null, temporary: false, response: json({ error: 'Нужны установка и PIN-код' }, 401) }
  const license = await env.DB.prepare('SELECT * FROM app_licenses WHERE installation_id=?').bind(installationId).first<AuthenticatedLicense>()
  if (!license || license.status !== 'active' || Date.parse(license.license_until) < Date.now()) return { license: null, temporary: false, response: json({ error: 'Лицензия не активна' }, 403) }
  const hash = await sha256(pin)
  const permanent = hash === license.pin_hash
  const temporary = hash === license.temporary_pin_hash && !!license.temporary_pin_expires_at && Date.parse(license.temporary_pin_expires_at) > Date.now()
  if (!permanent && !temporary) return { license: null, temporary: false, response: json({ error: 'Неверный или просроченный PIN-код' }, 401) }
  return { license, temporary, response: null }
}
