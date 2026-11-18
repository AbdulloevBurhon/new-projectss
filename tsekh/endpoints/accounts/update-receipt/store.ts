import { updateReceipt } from './service'
import type { UpdateReceiptInput } from './types'
import type { ReceiptRecord } from '../get-receipts/types'
import { loadAccounts } from '../get-accounts/store'

export async function saveReceiptChanges(input: UpdateReceiptInput) {
  const receipt = await updateReceipt(input)
  const rows = useState<ReceiptRecord[]>('account-receipts', () => [])
  rows.value = rows.value.map(row => row.id === receipt.id ? receipt : row)
  try { await loadAccounts() } catch { /* Receipt was already committed. */ }
  return receipt
}
