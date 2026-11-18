import { updateTransfer } from './service'
import type { UpdateTransferInput } from './types'
import type { TransferRecord } from '../get-transfers/types'
import { loadAccounts } from '../get-accounts/store'

export async function saveTransferChanges(input: UpdateTransferInput) {
  const transfer = await updateTransfer(input)
  const rows = useState<TransferRecord[]>('account-transfers', () => [])
  rows.value = rows.value.map(row => row.id === transfer.id ? transfer : row)
  try { await loadAccounts() } catch { /* Transfer was already committed. */ }
  return transfer
}
