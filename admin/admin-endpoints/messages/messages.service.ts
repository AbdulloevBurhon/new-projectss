import type { AdminMessage } from '@obshaya/contracts'
import type { MessageRow } from './messages.types'
import { adminApi } from '../core/admin-api'

export async function listMessages(clientId: string): Promise<MessageRow[]> {
  const rows = await adminApi<AdminMessage[]>(`/clients/${clientId}/messages`)
  return rows.map(row => ({ id: row.id, direction: row.sender === 'admin' ? 'outgoing' : 'incoming', text: row.body, date: row.createdAt, status: row.status }))
}
export function replyToClient(clientId: string, body: string) { return adminApi(`/clients/${clientId}/messages`, { method: 'POST', body: JSON.stringify({ body }) }) }
export function deleteMessage(id: string) { return adminApi(`/messages/${id}`, { method: 'DELETE' }) }
