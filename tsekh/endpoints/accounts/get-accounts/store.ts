import type { AccountRecord } from './types'
import { getAccounts } from './service'
import { getAccounts as getLegacyAccounts, saveAccounts } from '../accounts.service'

export async function loadAccounts() {
  const nuxt = tryUseNuxtApp()
  const accounts = nuxt ? useState<AccountRecord[]>('accounts', () => []) : undefined
  const employee = nuxt ? useCookie<string | null>('tsekh_employee_session') : undefined
  let rows = await getAccounts()
  if (!employee?.value && !rows.length && typeof window !== 'undefined') {
    let legacy: AccountRecord[]
    try { legacy = getLegacyAccounts() } catch { return rows }
    if (legacy.length) {
      await $fetch('/api/accounts/migrate', { method: 'POST', body: { accounts: legacy } })
      rows = await getAccounts()
    }
  }
  if (accounts) accounts.value = rows
  if (!employee?.value && (rows.length || typeof window !== 'undefined')) {
    try { saveAccounts(rows) } catch { /* Cache is only for existing offline selectors. */ }
  }
  return rows
}
