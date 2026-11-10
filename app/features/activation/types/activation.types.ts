import type { ProductId } from '~~/shared/contracts/product'
export interface SignedLicense { payload: { licenseId: string; deviceId: string; clientName: string; productId: ProductId; activatedAt: number; expiresAt: number }; token: string }
export type ActivationStatus = { status: 'pending' | 'rejected' } | { status: 'approved'; license: SignedLicense }
