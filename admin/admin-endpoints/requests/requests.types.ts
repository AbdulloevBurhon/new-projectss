export interface RequestRow {
  id: string
  client: string
  direction: string
  device: string
  version: string
  received: string
  licenseUntil: string
}

export interface RequestDecision { action: 'approve' | 'reject'; clientName?: string; licenseDays?: number }

export interface ActivationSupportMessage {
  id: string
  installationId: string
  productId: import('@obshaya/contracts').ProductId
  direction: string
  body: string
  receivedAt: string
}
