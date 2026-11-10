import type { ProductId } from '~~/shared/contracts/product'
export type { ProductId } from '~~/shared/contracts/product'

export interface ActivationRequest {
  id: string
  device_id: string
  app_version: string
  status: 'pending' | 'approved' | 'rejected'
  requested_at: number
  product_id: ProductId
}

export interface License {
  id: string
  device_id: string
  client_name: string
  activated_at: number
  expires_at: number
  status: 'active' | 'revoked'
  product_id: ProductId
  feedback_count?: number
}

export interface Release {
  product_id: ProductId
  version: string
  notes: string
  file_name: string
  sha256: string
  published_at: number
  published: number
}

export interface AdminOverview {
  requests: ActivationRequest[]
  licenses: License[]
  releases: Release[]
}

export interface AdminMessage {
  id: string
  license_id: string
  sender: 'client' | 'admin'
  message: string
  reply_to: string | null
  created_at: number
  read_at: number | null
  client_name: string
  device_id: string
  product_id: ProductId
}
