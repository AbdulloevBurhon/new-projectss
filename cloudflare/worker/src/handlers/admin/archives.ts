import type { Env } from '../../types'
import { corsHeaders, json } from '../../utils/http'

export async function handleArchives(request: Request, env: Env, id?: string, action?: string) {
  if (!id && request.method === 'GET') {
    const rows = await env.DB.prepare('SELECT a.id, l.client_name AS client, l.product AS productId, a.file_name AS fileName, a.size_bytes AS size, a.created_at AS updatedAt FROM app_archives a JOIN app_licenses l ON l.id=a.license_id ORDER BY a.created_at DESC').all()
    return json(rows.results)
  }
  if (!id) return json({ error: 'Архив не указан' }, 400)
  const archive = await env.DB.prepare('SELECT object_key, file_name FROM app_archives WHERE id=?').bind(id).first<{ object_key: string; file_name: string }>()
  if (!archive) return json({ error: 'Архив не найден' }, 404)
  if (action === 'download' && request.method === 'GET') {
    const object = await env.UPDATES_BUCKET.get(archive.object_key)
    if (!object) return json({ error: 'Файл архива не найден' }, 404)
    return new Response(object.body, { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="${archive.file_name}"` } })
  }
  if (request.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM app_archives WHERE id=?').bind(id).run()
    await env.UPDATES_BUCKET.delete(archive.object_key)
    return json({ ok: true })
  }
  return json({ error: 'Метод не поддерживается' }, 405)
}
