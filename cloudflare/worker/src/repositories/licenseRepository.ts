import type { Env } from '../types/env'
import type { LicenseRow } from '../services/runtime'

export function findLicenseById(env: Env, licenseId: string) {
  return env.DB.prepare('SELECT * FROM product_licenses WHERE id = ?').bind(licenseId).first<LicenseRow>()
}

export function findLicenseForDevice(env: Env, licenseId: string, deviceId: string) {
  return env.DB.prepare('SELECT * FROM product_licenses WHERE id = ? AND device_id = ?').bind(licenseId, deviceId).first<LicenseRow>()
}

export function findLicenseForProduct(env: Env, deviceId: string, productId: string) {
  return env.DB.prepare('SELECT id FROM product_licenses WHERE device_id = ? AND product_id = ?').bind(deviceId, productId).first<{ id: string }>()
}

export async function findActiveLicense(env: Env, licenseId: string, deviceId: string) {
  const license = await findLicenseForDevice(env, licenseId, deviceId)
  return license && license.status === 'active' && license.expires_at > Math.floor(Date.now() / 1000) ? license : null
}
