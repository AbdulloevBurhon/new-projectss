import { createId } from '~/features/license/utils/createId'
import type { ProductId } from '~~/shared/contracts/product'
import { licensePublicKeyPem } from './public-key'

let apiBase = 'https://tsekh4-license-api.burhon-2001-tjk.workers.dev'
export function configureLicenseApiBase(value: string) { apiBase = value.replace(/\/$/, '') }
const deviceKey = 'workshop-device-id-v1'
const licenseKey = 'workshop-license-v1'
const requestKey = 'workshop-activation-request-v1'
export const appVersion = '1.1.0'
const productVersions: Record<ProductId, string> = {
  tsekh: appVersion,
  shawarma: '1.0.0',
}
export function appVersionFor(productId: ProductId = 'tsekh') {
  return productVersions[productId]
}

export interface SignedLicense {
  payload: {
    licenseId: string
    deviceId: string
    clientName: string
    productId?: ProductId
    activatedAt: number
    expiresAt: number
  }
  token: string
}
export interface StoredLicense extends SignedLicense {}
export interface ClientMessage {
  id: string
  message: string
  sender: 'client' | 'admin'
  reply_to: string | null
  created_at: number
  read_at: number | null
}

function decodeBase64Url(value: string) {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/')
  const binary = atob(normalized + '='.repeat((4 - normalized.length % 4) % 4))
  return Uint8Array.from(binary, char => char.charCodeAt(0))
}
function decodePem(value: string) {
  const base64 = value.replace(/-----[^-]+-----/g, '').replace(/\s/g, '')
  return Uint8Array.from(atob(base64), char => char.charCodeAt(0))
}
export function getDeviceId() {
  let id = localStorage.getItem(deviceKey)
  if (!id) {
    id = createId()
    localStorage.setItem(deviceKey, id)
  }
  return id
}
export function readStoredLicense(): StoredLicense | undefined {
  const raw = localStorage.getItem(licenseKey)
  if (!raw) return
  try {
    const value = JSON.parse(raw) as StoredLicense
    if (!value?.payload?.licenseId || !value.token || value.payload.deviceId !== getDeviceId()) return
    return value
  } catch {
    return
  }
}
export function saveStoredLicense(value: StoredLicense) {
  localStorage.setItem(licenseKey, JSON.stringify(value))
}
export function readActivationRequest() {
  return localStorage.getItem(requestKey) || ''
}
export function saveActivationRequest(id: string) {
  localStorage.setItem(requestKey, id)
}
export function clearActivationRequest() {
  localStorage.removeItem(requestKey)
}
export async function verifyLicense(value: SignedLicense) {
  if (!crypto.subtle || !value?.token || value.payload.deviceId !== getDeviceId()) return false
  const [encodedPayload, encodedSignature] = value.token.split('.')
  if (!encodedPayload || !encodedSignature) return false
  let payload: unknown
  try {
    payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(encodedPayload)))
  } catch {
    return false
  }
  if (JSON.stringify(payload) !== JSON.stringify(value.payload)) return false
  const key = await crypto.subtle.importKey('spki', decodePem(licensePublicKeyPem), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
  return crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    decodeBase64Url(encodedSignature),
    new TextEncoder().encode(encodedPayload),
  )
}
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiBase + path, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  })
  const result = await response.json().catch(() => ({})) as { error?: string } & T
  if (!response.ok) throw new Error(result.error || 'Нет ответа от сервера лицензий.')
  return result
}
export async function createActivationRequest(productId: ProductId = 'tsekh') {
  const result = await request<{ requestId: string; status: string }>('/api/v1/activation/requests', {
    method: 'POST',
    body: JSON.stringify({ deviceId: getDeviceId(), appVersion, productId }),
  })
  saveActivationRequest(result.requestId)
  return result
}
export async function getActivationStatus(id: string) {
  return request<{ status: 'pending' | 'approved' | 'rejected'; license?: SignedLicense }>('/api/v1/activation/requests/' + encodeURIComponent(id))
}
export async function syncStoredLicense() {
  const stored = readStoredLicense()
  if (!stored || !navigator.onLine) return stored
  const result = await request<{ license: SignedLicense }>('/api/v1/client/sync', {
    method: 'POST',
    body: JSON.stringify({ deviceId: getDeviceId(), licenseId: stored.payload.licenseId, appVersion: appVersionFor(stored.payload.productId || 'tsekh') }),
  })
  if (!await verifyLicense(result.license)) throw new Error('Подпись лицензии не прошла проверку.')
  saveStoredLicense(result.license)
  return result.license
}
export async function redeemTemporaryPin(pin: string) {
  return request<{ ok: boolean; forceChangePin: boolean }>('/api/v1/client/pin/redeem', {
    method: 'POST',
    body: JSON.stringify({ deviceId: getDeviceId(), pin }),
  })
}
export async function sendClientFeedback(message: string) {
  const license = readStoredLicense()
  if (!license) throw new Error('Нет активированной лицензии на этом устройстве.')
  return request<{ ok: boolean; id: string }>('/api/v1/client/feedback', {
    method: 'POST',
    body: JSON.stringify({ deviceId: getDeviceId(), licenseId: license.payload.licenseId, message }),
  })
}
function clientFeedbackParams(license: StoredLicense) {
  return new URLSearchParams({ deviceId: getDeviceId(), licenseId: license.payload.licenseId })
}
export async function getClientFeedback() {
  const license = readStoredLicense()
  if (!license || !navigator.onLine) return [] as ClientMessage[]
  const result = await request<{ messages: ClientMessage[] }>('/api/v1/client/feedback?' + clientFeedbackParams(license))
  return result.messages
}
export async function getUnreadClientFeedbackCount() {
  const license = readStoredLicense()
  if (!license || !navigator.onLine) return 0
  const result = await request<{ count: number }>('/api/v1/client/feedback/unread?' + clientFeedbackParams(license))
  return result.count
}
export async function clearClientFeedback() {
  const license = readStoredLicense()
  if (!license || !navigator.onLine) return
  await request<{ ok: boolean }>('/api/v1/client/feedback/clear', {
    method: 'POST',
    body: JSON.stringify({ deviceId: getDeviceId(), licenseId: license.payload.licenseId }),
  })
}
export async function checkForUpdate() {
  const license = readStoredLicense()
  if (!license) throw new Error('Нет лицензии на этом устройстве.')
  const params = new URLSearchParams({
    deviceId: getDeviceId(),
    licenseId: license.payload.licenseId,
    current: appVersionFor(license.payload.productId || 'tsekh'),
  })
  return request<{ updateAvailable: boolean; version?: string; notes?: string; sha256?: string; fileName?: string; downloadUrl?: string }>(
    '/api/v1/client/update/latest?' + params.toString(),
  )
}
export function updateDownloadUrl(path: string) {
  const license = readStoredLicense()
  if (!license) throw new Error('Нет лицензии на этом устройстве.')
  const params = new URLSearchParams({ deviceId: getDeviceId(), licenseId: license.payload.licenseId })
  return apiBase + path + '?' + params.toString()
}
export function licenseApiBase() {
  return apiBase
}
