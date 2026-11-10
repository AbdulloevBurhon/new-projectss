export interface Account {
  id: string
  name: string
  openingCents: number
}

export type MovementKind = 'income' | 'expense'
export type AccountTab = 'accounts' | MovementKind

export interface AccountMovement {
  id: string
  kind: MovementKind
  accountId: string
  date: string
  createdAt?: string
  cents: number
  note: string
  sale?: SaleLine[]
  clientSale?: { clientId: string; totalCents: number }
  receiptId?: string
  workPaymentId?: string
}

export interface MovementDraft {
  kind: MovementKind
  accountId: string
  date: string
  amount: number | string
  note: string
}

export interface Ledger {
  accounts: Account[]
  movements: AccountMovement[]
}
import type { SaleLine } from '~/features/tsekh/sales/types/sales'

