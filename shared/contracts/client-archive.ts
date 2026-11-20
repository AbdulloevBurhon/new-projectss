import type { ProductId } from './index'
import { clientApi } from './client-api'

const archivePrefix = (product: ProductId) => `obshaya:data:${product}:`

export function createProductArchive(product: ProductId, options?: { database: unknown; excludedKeys: string[] }) {
  const prefix = archivePrefix(product)
  const entries = Object.fromEntries(Object.keys(localStorage)
    .filter(key => key.startsWith(prefix) && !options?.excludedKeys.includes(key))
    .map(key => [key, localStorage.getItem(key)]))
  const content = {
    format: 'obshaya-archive', schemaVersion: options ? 2 : 1, product, createdAt: new Date().toISOString(), entries,
    ...(options ? { database: options.database } : {}),
  }
  const date = new Date().toISOString().slice(0, 10)
  return { blob: new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' }), fileName: `${product}-${date}.json` }
}

export async function restoreProductArchive(file: File, product: ProductId, options?: {
  restoreDatabase: (snapshot: unknown) => Promise<unknown>
  excludedKeys: string[]
  confirm: (includesDatabase: boolean) => boolean
}) {
  const parsed = JSON.parse(await file.text()) as { format?: string; schemaVersion?: number; product?: string; entries?: Record<string, unknown>; database?: unknown } | null
  const includesDatabase = parsed?.schemaVersion === 2
  if (parsed?.format !== 'obshaya-archive' || (parsed.schemaVersion !== 1 && !(includesDatabase && options && parsed.database))
    || parsed.product !== product || !parsed.entries || typeof parsed.entries !== 'object' || Array.isArray(parsed.entries)) {
    throw new Error('Файл архива не подходит этому приложению или имеет неверный формат.')
  }
  const prefix = archivePrefix(product)
  if (Object.entries(parsed.entries).some(([key, value]) => !key.startsWith(prefix) || typeof value !== 'string')) throw new Error('Архив содержит недопустимые данные.')
  if (options && !options.confirm(includesDatabase)) return false
  const keys = Object.keys(localStorage).filter(key => key.startsWith(prefix))
  const managedKeys = includesDatabase ? options!.excludedKeys : []
  const previous = keys.filter(key => !managedKeys.includes(key)).map(key => [key, localStorage.getItem(key)!] as const)
  const incoming = Object.entries(parsed.entries).filter(([key]) => !managedKeys.includes(key)) as [string, string][]
  try {
    for (const [key] of previous) localStorage.removeItem(key)
    for (const [key, value] of incoming) localStorage.setItem(key, value)
    if (includesDatabase) await options!.restoreDatabase(parsed.database)
  } catch (error) {
    for (const [key] of incoming) localStorage.removeItem(key)
    for (const [key, value] of previous) localStorage.setItem(key, value)
    throw error
  }
  for (const key of managedKeys) localStorage.removeItem(key)
  return true
}

export function uploadProductArchive(baseUrl: string, file: File, product: ProductId, latest = false, signal?: AbortSignal) {
  const form = new FormData()
  form.set('file', file)
  return clientApi<{ ok: true; id: string }>(baseUrl, latest ? '/api/client/archives/latest' : '/api/client/archives', {
    method: latest ? 'PUT' : 'POST', body: form, signal,
  }, product)
}
