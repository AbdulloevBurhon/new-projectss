import { isProductId, productLabels } from '@obshaya/contracts'
import type { ArchiveRow } from './archives.types'
import { adminApi, downloadAdminFile } from '../core/admin-api'

export async function listArchives() {
  const rows = await adminApi<(ArchiveRow & { productId: string })[]>('/archives')
  return rows.map(({ productId, ...row }) => ({ ...row, direction: isProductId(productId) ? productLabels[productId] : productId }))
}
export function removeArchive(id: string) { return adminApi(`/archives/${id}`, { method: 'DELETE' }) }
export function downloadArchive(id: string, fileName: string) { return downloadAdminFile(`/archives/${id}/download`, fileName) }
