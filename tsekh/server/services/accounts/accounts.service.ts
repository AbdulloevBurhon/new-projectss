import { randomUUID } from 'node:crypto'
import database from '../../database/accounts/accounts.database'

export interface AccountRecord {
  id: string
  name: string
  amount: number
}

const list = database.prepare('SELECT id, name, amount FROM accounts ORDER BY created_at DESC, rowid DESC')
const insert = database.prepare('INSERT INTO accounts (id, name, amount) VALUES (?, ?, 0)')
const find = database.prepare('SELECT id, name, amount FROM accounts WHERE id = ?')
const update = database.prepare('UPDATE accounts SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
const remove = database.prepare('DELETE FROM accounts WHERE id = ?')
const count = database.prepare('SELECT COUNT(*) AS total FROM accounts')
const importRow = database.prepare('INSERT INTO accounts (id, name, amount) VALUES (@id, @name, @amount)')

export function getAccounts(): AccountRecord[] {
  return list.all() as AccountRecord[]
}

export function createAccount(name: string): AccountRecord {
  const id = randomUUID()
  insert.run(id, name)
  return find.get(id) as AccountRecord
}

export function updateAccount(id: string, name: string): AccountRecord | undefined {
  const result = update.run(name, id)
  return result.changes ? find.get(id) as AccountRecord : undefined
}

export function deleteAccount(id: string): boolean {
  return remove.run(id).changes > 0
}

export function migrateAccounts(rows: AccountRecord[]): boolean {
  if ((count.get() as { total: number }).total) return false
  const importAll = database.transaction((accounts: AccountRecord[]) => {
    for (const account of accounts) importRow.run(account)
  })
  importAll(rows)
  return true
}
