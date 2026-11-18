import type { Env } from '../../types'
import { findClientLicense } from '../../services/client-license'
import { createId } from '../../utils/crypto'
import { json } from '../../utils/http'

export async function uploadClientArchive(request: Request, env: Env, latest = false) {
  const auth = await findClientLicense(request, env)
  if (!auth.license) return auth.response
  if (!auth.license.cloud_archive_allowed) return json({ error: 'Администратор запретил сохранять данные в облако.' }, 403)
  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith('.json') || file.size < 1) return json({ error: 'Выберите JSON-файл архива' }, 400)
  if (file.size > 40 * 1024 * 1024) return json({ error: 'Размер архива должен быть до 40 МБ' }, 413)
  if (latest) {
    const id = `latest-${auth.license.id}`
    const key = `archives/${auth.license.id}/latest.json`
    await env.UPDATES_BUCKET.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: 'application/json' } })
    await env.DB.prepare(`INSERT INTO app_archives (id, license_id, object_key, file_name, size_bytes)
      VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET
      size_bytes=excluded.size_bytes, created_at=CURRENT_TIMESTAMP`)
      .bind(id, auth.license.id, key, `${auth.license.product}-backup.json`, file.size).run()
    return json({ ok: true, id })
  }
  const id = createId(); const objectKey = `archives/${auth.license.id}/${id}.json`
  await env.UPDATES_BUCKET.put(objectKey, await file.arrayBuffer(), { httpMetadata: { contentType: 'application/json' } })
  try {
    await env.DB.prepare('INSERT INTO app_archives (id, license_id, object_key, file_name, size_bytes) VALUES (?, ?, ?, ?, ?)')
      .bind(id, auth.license.id, objectKey, file.name, file.size).run()
  } catch (error) { await env.UPDATES_BUCKET.delete(objectKey); throw error }
  return json({ ok: true, id }, 201)
}
