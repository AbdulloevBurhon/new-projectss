import { updateAccount } from './service'
import type { UpdateAccountInput } from './types'
import type { AccountRecord } from '../get-accounts/types'
import { saveAccounts } from '../accounts.service'

export async function saveAccountChanges(input: UpdateAccountInput) {
  const account = await updateAccount(input)
  const rows = useState<AccountRecord[]>('accounts', () => [])
  rows.value = rows.value.map(row => row.id === account.id ? account : row)
  try { saveAccounts(rows.value) } catch { /* Cache is only for existing offline selectors. */ }
  return account
}
