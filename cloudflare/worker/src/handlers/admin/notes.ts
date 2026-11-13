import type { Env } from '../../types'
import { createId } from '../../utils/crypto'
import { json, readJson } from '../../utils/http'

interface NoteBody { clientName: string; amount?: string; description: string }

export async function handleNotes(request: Request, env: Env, id?: string) {
  if (!id && request.method === 'GET') {
    const rows = await env.DB.prepare('SELECT id, client_name AS clientName, amount, description, created_at AS createdAt FROM app_notes ORDER BY created_at DESC').all()
    return json(rows.results)
  }
  if (!id && request.method === 'POST') {
    const body = await readJson<NoteBody>(request)
    if (!body.clientName?.trim() || !body.description?.trim()) return json({ error: 'Укажите клиента и описание' }, 400)
    const note = { id: createId(), clientName: body.clientName.trim(), amount: body.amount?.trim() ?? '', description: body.description.trim(), createdAt: new Date().toISOString() }
    await env.DB.prepare('INSERT INTO app_notes (id, client_name, amount, description) VALUES (?, ?, ?, ?)').bind(note.id, note.clientName, note.amount, note.description).run()
    return json(note, 201)
  }
  if (id && request.method === 'PATCH') {
    const body = await readJson<NoteBody>(request)
    if (!body.clientName?.trim() || !body.description?.trim()) return json({ error: 'Укажите клиента и описание' }, 400)
    const result = await env.DB.prepare('UPDATE app_notes SET client_name=?, amount=?, description=? WHERE id=?').bind(body.clientName.trim(), body.amount?.trim() ?? '', body.description.trim(), id).run()
    return result.meta.changes ? json({ ok: true }) : json({ error: 'Заметка не найдена' }, 404)
  }
  if (id && request.method === 'DELETE') {
    const result = await env.DB.prepare('DELETE FROM app_notes WHERE id=?').bind(id).run()
    return result.meta.changes ? json({ ok: true }) : json({ error: 'Заметка не найдена' }, 404)
  }
  return json({ error: 'Метод не поддерживается' }, 405)
}
