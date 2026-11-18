import { deleteTransfer } from './service'
import type { DeleteTransferInput } from './types'
import type { TransferRecord } from '../get-transfers/types'
import { loadAccounts } from '../get-accounts/store'

export async function removeTransfer(input: DeleteTransferInput) {
  await deleteTransfer(input)
  const rows = useState<TransferRecord[]>('account-transfers', () => [])
  rows.value = rows.value.filter(row => row.id !== input.id)
  try { await loadAccounts() } catch { /* Transfer was already committed. */ }
}
