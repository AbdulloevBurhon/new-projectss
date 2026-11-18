import { deleteAccount } from './service'
import type { DeleteAccountInput } from './types'
import type { AccountRecord } from '../get-accounts/types'
import { saveAccounts } from '../accounts.service'

export async function removeAccount(input: DeleteAccountInput) {
  await deleteAccount(input)
  const rows = useState<AccountRecord[]>('accounts', () => [])
  rows.value = rows.value.filter(row => row.id !== input.id)
  try { saveAccounts(rows.value) } catch { /* Cache is only for existing offline selectors. */ }
}
