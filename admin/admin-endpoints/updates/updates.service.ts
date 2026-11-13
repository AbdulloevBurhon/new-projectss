import type { AdminUpdate, ProductId } from '@obshaya/contracts'
import type { UpdateReceipt, UpdateRow } from './updates.types'
import { adminApi, downloadAdminFile } from '../core/admin-api'

const labels: Record<ProductId, string> = { tsekh: 'Цех', shawarma: 'Шаурма' }
const ids: Record<string, ProductId> = { 'Цех': 'tsekh', 'Шаурма': 'shawarma' }

export async function listUpdates(): Promise<UpdateRow[]> {
  return (await adminApi<(AdminUpdate & { name: string })[]>('/updates')).map(row => ({ id: row.id, direction: labels[row.productId], name: row.name || `${labels[row.productId]} ${row.version}`, version: row.version, fileName: row.fileName, size: row.size, sha256: row.sha256, note: row.note, uploadedAt: row.uploadedAt }))
}
export async function publishUpdate(input: { direction: string; name: string; version: string; note: string; file: File }) {
  const form = new FormData(); form.set('product', ids[input.direction]); form.set('name', input.name); form.set('version', input.version); form.set('note', input.note); form.set('file', input.file)
  return adminApi<UpdateRow>('/updates', { method: 'POST', body: form })
}
export function listUpdateReceipts(id: string) { return adminApi<UpdateReceipt[]>(`/updates/${id}/receipts`) }
export function editUpdate(id: string, data: { name: string; version: string; note: string }) { return adminApi(`/updates/${id}`, { method: 'PATCH', body: JSON.stringify(data) }) }
export function removeUpdate(id: string) { return adminApi(`/updates/${id}`, { method: 'DELETE' }) }
export function downloadUpdate(id: string, fileName: string) { return downloadAdminFile(`/updates/${id}/download`, fileName) }
