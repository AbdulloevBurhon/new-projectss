import { createTransfer } from './service'
import type { TransferDraft } from './types'
import type { TransferRecord } from '../get-transfers/types'
import { loadAccounts } from '../get-accounts/store'

export async function saveTransfer(draft: TransferDraft) {
  const transfer = await createTransfer(draft)
  const rows = useState<TransferRecord[]>('account-transfers', () => [])
  rows.value = [transfer, ...rows.value.filter(row => row.id !== transfer.id)]
  try { await loadAccounts() } catch { /* Transfer was already committed. */ }
  return transfer
}
