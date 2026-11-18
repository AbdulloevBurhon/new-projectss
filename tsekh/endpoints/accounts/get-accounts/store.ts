import type { AccountRecord } from './types'
import { getAccounts } from './service'
import { getAccounts as getLegacyAccounts, saveAccounts } from '../accounts.service'

export async function loadAccounts() {
  let rows = await getAccounts()
  if (!rows.length && typeof window !== 'undefined') {
    let legacy: AccountRecord[]
    try { legacy = getLegacyAccounts() } catch { return rows }
    if (legacy.length) {
      await $fetch('/api/accounts/migrate', { method: 'POST', body: { accounts: legacy } })
      rows = await getAccounts()
    }
  }
  useState<AccountRecord[]>('accounts', () => []).value = rows
  if (rows.length || typeof window !== 'undefined') {
    try { saveAccounts(rows) } catch { /* Cache is only for existing offline selectors. */ }
  }
  return rows
}
