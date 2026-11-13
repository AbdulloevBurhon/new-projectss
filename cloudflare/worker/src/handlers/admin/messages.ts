import type { Env } from '../../types'
import { createId } from '../../utils/crypto'
import { json, readJson } from '../../utils/http'

interface MessageBody { body: string }

export async function handleMessages(request: Request, env: Env, licenseId?: string, messageId?: string) {
  if (licenseId && !messageId && request.method === 'GET') {
    await env.DB.prepare("UPDATE app_messages SET status='read' WHERE license_id=? AND sender='client'").bind(licenseId).run()
    const rows = await env.DB.prepare(`SELECT id, sender, body, status, created_at AS createdAt FROM app_messages
      WHERE license_id=? ORDER BY created_at ASC`).bind(licenseId).all()
    return json(rows.results)
  }
  if (licenseId && !messageId && request.method === 'POST') {
    const { body } = await readJson<MessageBody>(request)
    const text = body?.trim()
    if (!text || text.length > 1000) return json({ error: 'Сообщение должно содержать от 1 до 1000 символов' }, 400)
    const id = createId()
    await env.DB.prepare("INSERT INTO app_messages (id, license_id, sender, body) VALUES (?, ?, 'admin', ?)").bind(id, licenseId, text).run()
    return json({ id, sender: 'admin', body: text, status: 'sent', createdAt: new Date().toISOString() }, 201)
  }
  if (messageId && request.method === 'DELETE') {
    const result = await env.DB.prepare('DELETE FROM app_messages WHERE id=?').bind(messageId).run()
    return result.meta.changes ? json({ ok: true }) : json({ error: 'Сообщение не найдено' }, 404)
  }
  return json({ error: 'Маршрут сообщений не найден' }, 404)
}
