import type { Receipt } from '~/features/tsekh/warehouse/types/inventory'
import { localDate } from '~/features/tsekh/warehouse/utils/format'
import type { AccountMovement } from '../types/accounts'

export function receiptMovements(receipts: Receipt[]): AccountMovement[] {
  return receipts.flatMap(receipt => {
    if (!receipt.accountId) return []
    const names = receipt.lines.map(line => line.productName).join(', ')
    const cents = receipt.lines.reduce((sum, line) => sum + Math.round(line.sum * 100), 0)
    return [{
      id: `receipt-${receipt.id}`,
      kind: 'expense',
      accountId: receipt.accountId,
      date: localDate(receipt.date),
      createdAt: receipt.date,
      cents,
      note: `Поступление · ${names}`,
      receiptId: receipt.id,
    }]
  })
}
