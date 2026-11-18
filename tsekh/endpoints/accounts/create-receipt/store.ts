import { createReceipt } from './service'
import type { ReceiptDraft } from './types'
import type { ReceiptRecord } from '../get-receipts/types'
import { loadAccounts } from '../get-accounts/store'

export async function saveReceipt(draft: ReceiptDraft) {
  const receipt = await createReceipt(draft)
  const rows = useState<ReceiptRecord[]>('account-receipts', () => [])
  rows.value = [receipt, ...rows.value.filter(row => row.id !== receipt.id)]
  try { await loadAccounts() } catch { /* Receipt was already committed. */ }
  return receipt
}
