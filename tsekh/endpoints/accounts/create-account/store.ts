import { createAccount } from './service'
import type { CreateAccountInput } from './types'
import type { AccountRecord } from '../get-accounts/types'
import { saveAccounts } from '../accounts.service'

export async function saveAccount(input: CreateAccountInput) {
  const account = await createAccount(input)
  const rows = useState<AccountRecord[]>('accounts', () => [])
  rows.value = [account, ...rows.value.filter(row => row.id !== account.id)]
  try { saveAccounts(rows.value) } catch { /* Cache is only for existing offline selectors. */ }
  return account
}
