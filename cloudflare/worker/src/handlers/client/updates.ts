import type { Env } from '../../types'
import { findClientLicense } from '../../services/client-license'
import { json } from '../../utils/http'

export async function listClientUpdates(request: Request, env: Env) {
  const auth = await findClientLicense(request, env)
  if (!auth.license) return auth.response
  const rows = await env.DB.prepare(`SELECT u.id, u.version, u.file_name AS fileName, u.size_bytes AS size,
    u.sha256, u.note, u.created_at AS publishedAt FROM app_updates u
    LEFT JOIN app_update_receipts r ON r.update_id=u.id AND r.license_id=?
    WHERE u.product=? AND u.available=1 AND r.installed_at IS NULL ORDER BY u.created_at DESC`)
    .bind(auth.license.id, auth.license.product).all()
  return json(rows.results)
}
