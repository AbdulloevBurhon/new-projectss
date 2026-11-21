import database from '../../database/accounts/accounts.database'
import q from '../../database/sales/queries'
import '../sales/sales.service'
import type { AccountRecord } from '../../../endpoints/accounts/get-accounts/types'
import type { AccountOutflow } from '../../../endpoints/accounts/get-account-details/types'

const accountById = database.prepare('SELECT id, name, amount FROM accounts WHERE id = ?')
const outflowsByAccount = database.prepare(q.accountHistory)

export const getAccountDetails = database.transaction((id: string) => {
  const account = accountById.get(id) as AccountRecord | undefined
  if (!account) return undefined
  return { account, outflows: outflowsByAccount.all({ id }) as AccountOutflow[] }
})
