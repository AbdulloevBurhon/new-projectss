export interface ClientRow {
  id: string
  client: string
  direction: string
  device: string
  licenseFrom: string
  licenseUntil: string
  active: boolean
  expired: boolean
  version: string
  versionUpdatedAt: string
  versionHistory: Array<{ date: string; from: string; to: string }>
  unreadMessages: number
}
