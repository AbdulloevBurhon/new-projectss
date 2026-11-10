export interface WorkRecord {
  id: string
  date: string
  createdAt?: string
  techcardId: string
  techcardName: string
  wageCents: number
  quantity?: number
  finishedWarehouseId?: string
  payment?: WorkPayment
  materialUsage?: MaterialUsage
}

export interface Worker {
  id: string
  name: string
  records: WorkRecord[]
}

export interface WorkDraft {
  date: string
  techcardId: string
  wage: number | string
  quantity?: number | string
  warehouseId?: string
}

export interface WorkLineDraft {
  techcardId: string
  wage: number | string
  quantity: number | string
}

export interface PaidWorkDraft {
  date: string
  warehouseId: string
  finishedWarehouseId: string
  accountId: string
  lines: WorkLineDraft[]
}

interface WorkPayment {
  id: string
  accountId: string
  date: string
  workerName: string
}
import type { TechCardMaterial } from '~/features/tsekh/warehouse/types/inventory'

export interface MaterialUsage {
  warehouseId: string
  warehouseName?: string
  workerName?: string
  lines: (TechCardMaterial & { costCents?: number })[]
}

