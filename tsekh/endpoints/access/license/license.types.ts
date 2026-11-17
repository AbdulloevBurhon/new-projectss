export type LicenseStatus = 'pending' | 'active' | 'disabled' | 'expired'

export interface LicenseSnapshot {
  status: LicenseStatus
  direction: 'tsekh'
  expiresAt: string | null
}
