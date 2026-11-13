import type { ProductId } from './index'

export interface AdminRequest {
  id: string
  installationId: string
  productId: ProductId
  clientName: string
  appVersion: string
  status: 'pending' | 'approved' | 'rejected'
  receivedAt: string
}

export interface AdminClient {
  id: string
  installationId: string
  productId: ProductId
  clientName: string
  status: 'active' | 'disabled' | 'removed' | 'expired'
  licenseFrom: string
  licenseUntil: string
  currentVersion: string
  unreadMessages: number
}

export interface AdminMessage {
  id: string
  sender: 'client' | 'admin'
  body: string
  status: 'sent' | 'read'
  createdAt: string
}

export interface AdminUpdate {
  id: string
  productId: ProductId
  version: string
  fileName: string
  size: number
  sha256: string
  note: string
  available: boolean
  uploadedAt: string
}
