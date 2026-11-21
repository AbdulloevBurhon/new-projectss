import type { ProductId } from '@obshaya/contracts'

export interface ClientRow {
  id: string
  client: string
  direction: string
  productId: ProductId
  device: string
  licenseFrom: string
  licenseUntil: string
  cloudArchiveAllowed: boolean
  telegramIntervalMinutes: number
  active: boolean
  expired: boolean
  version: string
  versionUpdatedAt: string
  versionHistory: Array<{ date: string; from: string; to: string }>
  unreadMessages: number
}
