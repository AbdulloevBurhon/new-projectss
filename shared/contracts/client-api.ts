import type { ProductId } from './index'

const INSTALLATION_KEY = 'obshaya-installation-id'
const CLIENT_PIN_KEY = 'obshaya-client-pin'
const TEMP_PIN_UNTIL_KEY = 'obshaya-temp-pin-until'

export interface ActivationStatus {
  requestStatus: 'pending' | 'approved' | 'rejected'
  productId: ProductId
  licenseStatus: 'active' | 'disabled' | 'removed' | 'expired' | null
  licenseUntil: string | null
  initialPin?: string | null
}

export function installationId(product: ProductId) {
  const key = `${INSTALLATION_KEY}:${product}`
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Array.from(crypto.getRandomValues(new Uint8Array(16)), n => n.toString(16).padStart(2, '0')).join('')}`
    localStorage.setItem(key, id)
  }
  return id
}

export function saveClientPin(pin: string, temporary = false, expiresAt?: string | null) {
  sessionStorage.setItem(CLIENT_PIN_KEY, pin)
  if (temporary) sessionStorage.setItem(TEMP_PIN_UNTIL_KEY, String(expiresAt ? Date.parse(expiresAt) : Date.now() + 60 * 60 * 1000))
  else sessionStorage.removeItem(TEMP_PIN_UNTIL_KEY)
}
export function getClientPin() { return sessionStorage.getItem(CLIENT_PIN_KEY) ?? '' }
export function isTemporaryPin() { return Number(sessionStorage.getItem(TEMP_PIN_UNTIL_KEY) || 0) > Date.now() }
export function temporaryPinExpired() { return !!sessionStorage.getItem(TEMP_PIN_UNTIL_KEY) && !isTemporaryPin() }
export function clearClientPin() { sessionStorage.removeItem(CLIENT_PIN_KEY); sessionStorage.removeItem(TEMP_PIN_UNTIL_KEY) }

export async function clientApi<T>(baseUrl: string, path: string, init: RequestInit = {}, product?: ProductId): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  if (product) {
    const pin = sessionStorage.getItem(CLIENT_PIN_KEY)
    if (!pin) throw new Error('Сначала войдите по PIN-коду')
    headers.set('X-Installation-Id', installationId(product))
    headers.set('X-Client-Pin', pin)
  }
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, { ...init, headers })
  const payload = await response.json().catch(() => ({})) as T & { error?: string }
  if (!response.ok) throw new Error(payload.error || `Ошибка сервера (${response.status})`)
  return payload
}

export async function downloadClientFile(baseUrl: string, path: string, product: ProductId) {
  const pin = getClientPin()
  if (!pin) throw new Error('Сначала войдите по PIN-коду')
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, { headers: { 'X-Installation-Id': installationId(product), 'X-Client-Pin': pin } })
  if (!response.ok) {
    const result = await response.json().catch(() => ({})) as { error?: string }
    throw new Error(result.error || `Ошибка скачивания (${response.status})`)
  }
  const fileName = response.headers.get('Content-Disposition')?.match(/filename="?([^";]+)"?/i)?.[1] ?? 'update.exe'
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a'); link.href = url; link.download = fileName; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
