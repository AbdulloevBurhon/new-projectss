import type { Env } from '../types/env'
export type ProductId = 'tsekh' | 'shawarma'
export type LicenseRow = { id: string; device_id: string; product_id: ProductId; client_name: string; activated_at: number; expires_at: number; status: 'active' | 'revoked' }
export const json = (data: unknown, status = 200, headers: HeadersInit = {}) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } })
export const now = () => Math.floor(Date.now() / 1000)
export const id = () => crypto.randomUUID()
export const bytesToBase64Url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
export const textToBase64Url = (value: string) => bytesToBase64Url(new TextEncoder().encode(value))
export const decodeBase64 = (value: string) => Uint8Array.from(atob(value.replaceAll('\\n', '\n').replace(/-----[^-]+-----/g, '').replace(/\s/g, '')), c => c.charCodeAt(0))
export const digest = async (value: string) => bytesToBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))))
export const secureEquals = (left: string, right: string) => {
  const a = new TextEncoder().encode(left), b = new TextEncoder().encode(right)
  if (a.length !== b.length) return false
  let difference = 0
  for (let index = 0; index < a.length; index++) difference |= a[index]! ^ b[index]!
  return difference === 0
}
export const adminKey = (env: Env) => env.ADMIN_KEY || env.ADMIN_API_KEY || ''
export const isProduct = (value: unknown): value is ProductId => value === 'tsekh' || value === 'shawarma'
export const validVersion = (value: string) => /^\d+\.\d+\.\d+$/.test(value)
export const newerVersion = (candidate: string, current: string) => {
  if (!validVersion(candidate) || !validVersion(current)) return false
  const a = candidate.split('.').map(Number), b = current.split('.').map(Number)
  for (let index = 0; index < 3; index++) { if (a[index]! > b[index]!) return true; if (a[index]! < b[index]!) return false }
  return false
}

export function cors(request: Request, env: Env) {
  const origin = request.headers.get('Origin') || ''
  const allowed = (env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001,http://localhost:3002,http://127.0.0.1:3000').split(',').map(item => item.trim())
  const headers: Record<string, string> = { 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS', 'access-control-allow-headers': 'Authorization,Content-Type', 'access-control-max-age': '86400', vary: 'Origin' }
  if (allowed.includes(origin)) headers['access-control-allow-origin'] = origin
  return headers
}
export async function body<T>(request: Request): Promise<T> {
  try { return await request.json() as T } catch { throw new Error('Некорректное тело запроса.') }
}
export function pathId(path: string, prefix: string, suffix = '') {
  if (!path.startsWith(prefix) || (suffix && !path.endsWith(suffix))) return ''
  return decodeURIComponent(path.slice(prefix.length, suffix ? -suffix.length : undefined))
}
export async function signLicense(env: Env, row: LicenseRow) {
  const privateKey = env.LICENSE_PRIVATE_KEY || env.LICENSE_SIGNING_PRIVATE_KEY
  if (!privateKey) throw new Error('На Worker не задан закрытый ключ подписи лицензий.')
  const payload = { licenseId: row.id, deviceId: row.device_id, clientName: row.client_name, productId: row.product_id, activatedAt: row.activated_at, expiresAt: row.expires_at }
  const encoded = textToBase64Url(JSON.stringify(payload))
  const key = await crypto.subtle.importKey('pkcs8', decodeBase64(privateKey), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(encoded))
  return { payload, token: `${encoded}.${bytesToBase64Url(new Uint8Array(signature))}` }
}
export async function issueSession(env: Env) {
  const secret = adminKey(env)
  if (!secret) throw new Error('На Worker не задан ключ администратора.')
  const payload = textToBase64Url(JSON.stringify({ exp: now() + 8 * 60 * 60, role: 'admin' }))
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return `${payload}.${bytesToBase64Url(new Uint8Array(signature))}`
}
export async function isAdmin(request: Request, env: Env) {
  const secret = adminKey(env)
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') || ''
  const [payload, supplied] = token.split('.')
  if (!secret) return false
  // Accept the legacy bearer key so the old admin client remains compatible during transition.
  if (token === secret) return true
  if (!payload || !supplied) return false
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
  try {
    const signature = Uint8Array.from(atob(supplied.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(supplied.length / 4) * 4, '=')), c => c.charCodeAt(0))
    if (!await crypto.subtle.verify('HMAC', key, signature, new TextEncoder().encode(payload))) return false
    const claims = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(payload.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(payload.length / 4) * 4, '=')), c => c.charCodeAt(0)))) as { exp?: number; role?: string }
    return claims.role === 'admin' && Number(claims.exp) > now()
  } catch { return false }
}
