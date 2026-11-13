import type { NoteRow } from './notes.types'
import { adminApi } from '../core/admin-api'

export function listNotes() { return adminApi<NoteRow[]>('/notes') }
export function saveNote(data: Omit<NoteRow, 'id' | 'createdAt'>, id?: string) {
  return adminApi(id ? `/notes/${id}` : '/notes', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(data) })
}
export function removeNote(id: string) { return adminApi(`/notes/${id}`, { method: 'DELETE' }) }
