import type { ProductId } from '~~/shared/contracts/product'

const pinKey = (productId: ProductId = 'tsekh') => productId === 'shawarma' ? 'shawarma-pin-v1' : 'workshop-pin-v1'
const hex = (bytes: Uint8Array) => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')

export function readPin(productId: ProductId = 'tsekh') {
  const saved = localStorage.getItem(pinKey(productId))
  if (saved === null) return
  const value = JSON.parse(saved) as { salt: string; hash: string } | null
  if (!value || !/^[a-f0-9]{32}$/.test(value.salt) || !/^[a-f0-9]{64}$/.test(value.hash)) {
    throw new Error('Не удалось прочитать настройки ПИН-кода.')
  }
  return value
}

async function derive(pin: string, salt: Uint8Array<ArrayBuffer>) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 150_000 }, key, 256)
  return hex(new Uint8Array(bits))
}

export async function savePin(pin: string, productId: ProductId = 'tsekh') {
  if (!/^\d{4}$/.test(pin)) throw new Error('Введите четыре цифры.')
  if (!crypto.subtle) throw new Error('Для ПИН-кода откройте приложение через HTTPS или localhost.')
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await derive(pin, salt)
  localStorage.setItem(pinKey(productId), JSON.stringify({ salt: hex(salt), hash }))
}

export async function verifyPin(pin: string, productId: ProductId = 'tsekh') {
  const saved = readPin(productId)
  if (!saved) return true
  if (!/^\d{4}$/.test(pin)) return false
  const salt = Uint8Array.from(saved.salt.match(/../g)!, byte => Number.parseInt(byte, 16))
  const hash = await derive(pin, salt)
  const current = readPin(productId)
  return current?.salt === saved.salt && current.hash === saved.hash && hash === saved.hash
}

export const removePin = (productId: ProductId = 'tsekh') => localStorage.removeItem(pinKey(productId))
export const pinChanged = (key: string | null, productId: ProductId = 'tsekh') => key === null || key === pinKey(productId)
