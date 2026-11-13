import type { AdminClient } from '@obshaya/contracts'
import type { ClientRow } from './clients.types'
import { adminApi } from '../core/admin-api'

const labels = { tsekh: 'Цех', shawarma: 'Шаурма' }

export async function listClients(): Promise<ClientRow[]> {
  const rows = await adminApi<AdminClient[]>('/clients')
  return rows.map(row => ({ id: row.id, client: row.clientName, direction: labels[row.productId], device: row.installationId, licenseFrom: row.licenseFrom,
    licenseUntil: row.licenseUntil.slice(0, 10), active: row.status === 'active', expired: row.status === 'expired', version: row.currentVersion, versionUpdatedAt: row.licenseUntil,
    versionHistory: [], unreadMessages: row.unreadMessages }))
}

export function editClient(id: string, data: { clientName?: string; licenseUntil?: string; status?: 'active' | 'disabled' }) { return adminApi(`/clients/${id}`, { method: 'PATCH', body: JSON.stringify(data) }) }
export function removeClient(id: string) { return adminApi(`/clients/${id}`, { method: 'DELETE' }) }
export function issueTemporaryPin(id: string) { return adminApi<{ pin: string; expiresAt: string }>(`/clients/${id}/temporary-pin`, { method: 'POST' }) }
export function issueLoginPin(id: string) { return adminApi<{ pin: string }>(`/clients/${id}/login-pin`, { method: 'POST' }) }
export function listClientVersionHistory(id: string) { return adminApi<Array<{ date: string; from: string; to: string }>>(`/clients/${id}/updates`) }
