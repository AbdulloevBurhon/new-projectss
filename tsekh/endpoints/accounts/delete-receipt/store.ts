import { deleteReceipt } from './service'
import type { DeleteReceiptInput } from './types'
import type { ReceiptRecord } from '../get-receipts/types'
import { loadAccounts } from '../get-accounts/store'

export async function removeReceipt(input: DeleteReceiptInput) {
  await deleteReceipt(input)
  const rows = useState<ReceiptRecord[]>('account-receipts', () => [])
  rows.value = rows.value.filter(row => row.id !== input.id)
  try { await loadAccounts() } catch { /* Receipt was already committed. */ }
}
