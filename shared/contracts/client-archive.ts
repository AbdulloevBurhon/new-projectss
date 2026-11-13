import type { ProductId } from './index'
import { clientApi } from './client-api'

const archivePrefix = (product: ProductId) => `obshaya:data:${product}:`

export function createProductArchive(product: ProductId) {
  const prefix = archivePrefix(product)
  const entries = Object.fromEntries(Object.keys(localStorage)
    .filter(key => key.startsWith(prefix))
    .map(key => [key, localStorage.getItem(key)]))
  const content = { format: 'obshaya-archive', schemaVersion: 1, product, createdAt: new Date().toISOString(), entries }
  const date = new Date().toISOString().slice(0, 10)
  return { blob: new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' }), fileName: `${product}-${date}.json` }
}

export async function restoreProductArchive(file: File, product: ProductId) {
  const parsed = JSON.parse(await file.text()) as { format?: string; schemaVersion?: number; product?: string; entries?: Record<string, unknown> }
  if (parsed.format !== 'obshaya-archive' || parsed.schemaVersion !== 1 || parsed.product !== product || !parsed.entries || typeof parsed.entries !== 'object' || Array.isArray(parsed.entries)) {
    throw new Error('Файл архива не подходит этому приложению или имеет неверный формат.')
  }
  const prefix = archivePrefix(product)
  if (Object.entries(parsed.entries).some(([key, value]) => !key.startsWith(prefix) || typeof value !== 'string')) throw new Error('Архив содержит недопустимые данные.')
  for (const key of Object.keys(localStorage)) if (key.startsWith(prefix)) localStorage.removeItem(key)
  for (const [key, value] of Object.entries(parsed.entries)) localStorage.setItem(key, value as string)
}

export function uploadProductArchive(baseUrl: string, file: File, product: ProductId) {
  const form = new FormData()
  form.set('file', file)
  return clientApi<{ ok: true; id: string }>(baseUrl, '/api/client/archives', { method: 'POST', body: form }, product)
}
