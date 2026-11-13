import type { AdminRequest } from '@obshaya/contracts'
import type { RequestDecision, RequestRow } from './requests.types'
import { adminApi } from '../core/admin-api'

const names = { tsekh: 'Цех', shawarma: 'Шаурма' }

export async function listRequests(): Promise<RequestRow[]> {
  const rows = await adminApi<AdminRequest[]>('/requests')
  return rows.map(row => ({ id: row.id, client: row.clientName, direction: names[row.productId], device: row.installationId, version: row.appVersion, received: row.receivedAt, licenseUntil: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10) }))
}

export function decideRequest(id: string, body: RequestDecision) {
  return adminApi<{ ok: boolean; initialPin?: string }>(`/requests/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
}
