export const productLabels = {
  tsekh: 'Цех',
  shawarma: 'Шаурма',
  production: 'Простое производство',
} as const

export type ProductId = keyof typeof productLabels

export function isProductId(value: unknown): value is ProductId {
  return typeof value === 'string' && Object.hasOwn(productLabels, value)
}

export type LicenseStatus = 'pending' | 'active' | 'disabled' | 'expired' | 'rejected'

export interface DeviceIdentity {
  installationId: string
  product: ProductId
}

export type { AdminClient, AdminMessage, AdminRequest, AdminUpdate } from './admin'
