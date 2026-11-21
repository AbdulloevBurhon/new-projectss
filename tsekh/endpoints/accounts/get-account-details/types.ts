import type { AccountRecord } from '../get-accounts/types'

export interface AccountOutflow {
  id: string
  kind: 'purchase' | 'expense' | 'transfer' | 'transfer-in' | 'sale' | 'receipt' | 'client-payment'
  date: string
  description: string
  employee: string | null
  amount: number
  unit: string | null
  quantity: number | null
  unitPrice: number | null
  contentUnit: string | null
  contentQuantity: number | null
}

export interface AccountDetails {
  account: AccountRecord
  outflows: AccountOutflow[]
}
