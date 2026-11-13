export function createId() { return crypto.randomUUID() }

export async function sha256(value: string | ArrayBuffer) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

export function randomPin() { return String(crypto.getRandomValues(new Uint32Array(1))[0] % 100000).padStart(5, '0') }
