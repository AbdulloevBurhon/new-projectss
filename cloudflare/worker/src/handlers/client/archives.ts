import type { Env } from '../../types'
import { findClientLicense } from '../../services/client-license'
import { createId } from '../../utils/crypto'
import { json } from '../../utils/http'

export async function uploadClientArchive(request: Request, env: Env) {
  const auth = await findClientLicense(request, env)
  if (!auth.license) return auth.response
  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith('.json') || file.size < 1) return json({ error: 'Выберите JSON-файл архива' }, 400)
  if (file.size > 40 * 1024 * 1024) return json({ error: 'Размер архива должен быть до 40 МБ' }, 413)
  const id = createId(); const objectKey = `archives/${auth.license.id}/${id}.json`
  await env.UPDATES_BUCKET.put(objectKey, await file.arrayBuffer(), { httpMetadata: { contentType: 'application/json' } })
  try {
    await env.DB.prepare('INSERT INTO app_archives (id, license_id, object_key, file_name, size_bytes) VALUES (?, ?, ?, ?, ?)')
      .bind(id, auth.license.id, objectKey, file.name, file.size).run()
  } catch (error) { await env.UPDATES_BUCKET.delete(objectKey); throw error }
  return json({ ok: true, id }, 201)
}
