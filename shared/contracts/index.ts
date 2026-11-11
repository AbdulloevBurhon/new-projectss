export type ProductId = 'tsekh' | 'shawarma'

export type LicenseStatus = 'pending' | 'active' | 'disabled' | 'expired' | 'rejected'

export interface DeviceIdentity {
  installationId: string
  product: ProductId
}
