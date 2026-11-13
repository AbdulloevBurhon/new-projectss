import type { Env, ProductId } from '../../types'
import { createId, sha256 } from '../../utils/crypto'
import { findClientLicense } from '../../services/client-license'
import { corsHeaders, json, readJson } from '../../utils/http'

const products: Record<string, ProductId> = { 'Цех': 'tsekh', 'Шаурма': 'shawarma', tsekh: 'tsekh', shawarma: 'shawarma' }
const labels: Record<ProductId, string> = { tsekh: 'Цех', shawarma: 'Шаурма' }

export async function handleUpdates(request: Request, env: Env, id?: string, action?: string, clientRequest = false) {
  if (!id && request.method === 'GET') {
    const result = await env.DB.prepare('SELECT id, product AS productId, name, version, file_name AS fileName, size_bytes AS size, sha256, note, available, created_at AS uploadedAt FROM app_updates ORDER BY created_at DESC').all()
    return json(result.results)
  }
  if (!id && request.method === 'POST') return uploadUpdate(request, env)
  if (id && action === 'receipts' && request.method === 'GET') {
    const rows = await env.DB.prepare(`SELECT l.id, l.client_name AS client, l.installation_id AS device, l.current_version AS version,
      r.downloaded_at AS downloadedAt, r.installed_at AS installedAt FROM app_licenses l
      LEFT JOIN app_update_receipts r ON r.license_id=l.id AND r.update_id=?
      WHERE l.product=(SELECT product FROM app_updates WHERE id=?) AND l.status!='removed' ORDER BY l.client_name`).bind(id, id).all()
    return json(rows.results)
  }
  if (id && request.method === 'PATCH') {
    const body = await readJson<{ name: string; version: string; note: string }>(request)
    if (!body.version?.trim()) return json({ error: 'Укажите версию' }, 400)
    const result = await env.DB.prepare('UPDATE app_updates SET name=?, version=?, note=? WHERE id=?').bind(body.name?.trim().slice(0, 120) ?? '', body.version.trim(), body.note?.trim().slice(0, 2000) ?? '', id).run()
    return result.meta.changes ? json({ ok: true }) : json({ error: 'Обновление не найдено' }, 404)
  }
  if (id && action === 'download' && request.method === 'GET') return downloadUpdate(request, env, id, clientRequest)
  if (id && action === 'receipt' && request.method === 'POST') return reportUpdate(request, env, id)
  if (id && request.method === 'DELETE') return deleteUpdate(env, id)
  return json({ error: 'Метод не поддерживается' }, 405)
}

async function uploadUpdate(request: Request, env: Env) {
  const form = await request.formData(); const product = products[String(form.get('product') ?? '')]
  const name = String(form.get('name') ?? '').trim().slice(0, 120); const version = String(form.get('version') ?? '').trim(); const note = String(form.get('note') ?? '').trim().slice(0, 2000)
  const file = form.get('file')
  if (!product || !version || !(file instanceof File) || !file.name.toLowerCase().endsWith('.exe')) return json({ error: 'Укажите направление, версию и EXE-файл' }, 400)
  if (!file.size || file.size > 40 * 1024 * 1024) return json({ error: 'Размер EXE должен быть до 40 МБ' }, 413)
  const id = createId(); const key = `updates/${product}/${version}/${id}.exe`; const data = await file.arrayBuffer()
  await env.UPDATES_BUCKET.put(key, data, { httpMetadata: { contentType: 'application/octet-stream' } })
  try {
    await env.DB.prepare('INSERT INTO app_updates (id, product, name, version, file_name, object_key, size_bytes, sha256, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, product, name || file.name.replace(/\.exe$/i, ''), version, file.name, key, file.size, await sha256(data), note).run()
  } catch (error) {
    await env.UPDATES_BUCKET.delete(key)
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) return json({ error: 'Такая версия уже опубликована для этого направления' }, 409)
    throw error
  }
  return json({ id, productId: product, name: name || file.name.replace(/\.exe$/i, ''), direction: labels[product], version, fileName: file.name, size: file.size, note, uploadedAt: new Date().toISOString() }, 201)
}

async function downloadUpdate(request: Request, env: Env, id: string, clientRequest: boolean) {
  const auth = clientRequest ? await findClientLicense(request, env) : null
  if (auth && !auth.license) return auth.response
  const update = await env.DB.prepare('SELECT * FROM app_updates WHERE id=? AND available=1').bind(id).first<Record<string, unknown>>()
  if (!update) return json({ error: 'Обновление недоступно' }, 404)
  if (auth?.license && update.product !== auth.license.product) return json({ error: 'Обновление предназначено для другого направления' }, 403)
  const object = await env.UPDATES_BUCKET.get(String(update.object_key))
  if (!object) return json({ error: 'Файл обновления не найден' }, 404)
  if (auth?.license) await env.DB.prepare('INSERT INTO app_update_receipts (update_id, license_id, downloaded_at) VALUES (?, ?, ?) ON CONFLICT(update_id, license_id) DO UPDATE SET downloaded_at=excluded.downloaded_at')
    .bind(id, auth.license.id, new Date().toISOString()).run()
  return new Response(object.body, { headers: { ...corsHeaders, 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="${update.file_name}"`, 'X-Content-SHA256': String(update.sha256) } })
}

async function reportUpdate(request: Request, env: Env, id: string) {
  const auth = await findClientLicense(request, env)
  if (!auth.license) return auth.response
  const body = await readJson<{ installed?: boolean }>(request)
  const update = await env.DB.prepare('SELECT product FROM app_updates WHERE id=? AND available=1').bind(id).first<{ product: ProductId }>()
  if (!update) return json({ error: 'Обновление не найдено' }, 404)
  if (update.product !== auth.license.product) return json({ error: 'Обновление предназначено для другого направления' }, 403)
  const now = new Date().toISOString()
  await env.DB.prepare('INSERT INTO app_update_receipts (update_id, license_id, downloaded_at, installed_at) VALUES (?, ?, ?, ?) ON CONFLICT(update_id, license_id) DO UPDATE SET downloaded_at=excluded.downloaded_at, installed_at=excluded.installed_at')
    .bind(id, auth.license.id, now, body.installed ? now : null).run()
  if (body.installed) await env.DB.prepare('UPDATE app_licenses SET current_version=(SELECT version FROM app_updates WHERE id=?), updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(id, auth.license.id).run()
  return json({ ok: true })
}

async function deleteUpdate(env: Env, id: string) {
  const update = await env.DB.prepare('SELECT object_key FROM app_updates WHERE id=?').bind(id).first<{ object_key: string }>()
  if (!update) return json({ error: 'Обновление не найдено' }, 404)
  const used = await env.DB.prepare('SELECT COUNT(*) AS total FROM app_update_receipts WHERE update_id=? AND installed_at IS NOT NULL').bind(id).first<{ total: number }>()
  if (used?.total) return json({ error: 'Версию нельзя удалить: её уже установили клиенты' }, 409)
  await env.DB.prepare('DELETE FROM app_update_receipts WHERE update_id=?').bind(id).run()
  await env.DB.prepare('DELETE FROM app_updates WHERE id=?').bind(id).run(); await env.UPDATES_BUCKET.delete(update.object_key)
  return json({ ok: true })
}
