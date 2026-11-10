import { readLedger } from '~/features/tsekh/accounts/services/accounts-storage'
import { accountBalances } from '~/features/tsekh/accounts/utils/ledger'
import type { Inventory } from '../types/inventory'
import { createReceipt, type ReceiptLineDraft } from '../utils/receipts'

export function addPaidReceipt(inventory: Inventory, warehouseId: string, accountId: string, draft: ReceiptLineDraft) {
  const balance = accountBalances(readLedger()).get(accountId)
  if (balance === undefined) throw new Error('Выберите существующий счёт.')

  const receipt = createReceipt(inventory, warehouseId, [draft])
  const cents = Math.round(receipt.lines[0]!.sum * 100)
  if (cents <= 0) throw new Error('Сумма поступления должна быть больше нуля.')
  if (balance < cents) throw new Error('На счёте недостаточно средств.')

  inventory.receipts.push({ ...receipt, accountId })
}
