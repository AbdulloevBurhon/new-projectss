import type { ArchiveRow } from './archives.types'
import { adminApi, downloadAdminFile } from '../core/admin-api'

const labels: Record<string, string> = { tsekh: 'Цех', shawarma: 'Шаурма' }
export async function listArchives() {
  const rows = await adminApi<(ArchiveRow & { productId: string })[]>('/archives')
  return rows.map(({ productId, ...row }) => ({ ...row, direction: labels[productId] ?? productId }))
}
export function removeArchive(id: string) { return adminApi(`/archives/${id}`, { method: 'DELETE' }) }
export function downloadArchive(id: string, fileName: string) { return downloadAdminFile(`/archives/${id}/download`, fileName) }
