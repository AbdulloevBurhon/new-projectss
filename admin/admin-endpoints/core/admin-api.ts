const API_BASE = 'https://obshaya-programma-api.burhon-2001-tjk.workers.dev'
const TOKEN_KEY = 'obshaya-admin-key'
let token = ''

export function setAdminKey(value: string) {
  token = value
  if (import.meta.client) sessionStorage.setItem(TOKEN_KEY, value)
}

export function clearAdminKey() {
  token = ''
  if (import.meta.client) sessionStorage.removeItem(TOKEN_KEY)
}

export function getAdminKey() {
  if (token) return token
  if (!import.meta.client) return ''
  token = sessionStorage.getItem(TOKEN_KEY) ?? ''
  return token
}

export async function adminApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${getAdminKey()}`)
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  const response = await fetch(`${API_BASE}/api/admin${path}`, { ...init, headers })
  const payload = await response.json().catch(() => ({})) as { error?: string }
  if (!response.ok) throw new Error(payload.error || `Ошибка API (${response.status})`)
  return payload as T
}

export async function checkAdminKey(value: string) {
  const response = await fetch(`${API_BASE}/api/admin/auth`, { headers: { Authorization: `Bearer ${value}` } })
  return response.ok
}

export async function downloadAdminFile(path: string, fileName: string) {
  const response = await fetch(`${API_BASE}/api/admin${path}`, { headers: { Authorization: `Bearer ${getAdminKey()}` } })
  if (!response.ok) throw new Error(`Не удалось скачать файл (${response.status})`)
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a'); link.href = url; link.download = fileName; link.click()
  URL.revokeObjectURL(url)
}
