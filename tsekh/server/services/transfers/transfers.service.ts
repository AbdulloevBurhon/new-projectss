import { randomUUID } from 'node:crypto'
import database from '../../database/accounts/accounts.database'

export interface TransferDraft {
  date: string
  sourceAccountId: string
  targetAccountId: string
  amount: number
  note: string
}

export interface TransferRecord extends TransferDraft {
  id: string
  createdAt: string
  sourceAccountName: string
  targetAccountName: string
}

export function validateTransferDraft(value: TransferDraft) {
  const date = typeof value?.date === 'string' ? new Date(`${value.date}T00:00:00.000Z`) : null
  const validDate = date && !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value.date
  if (!validDate || typeof value.sourceAccountId !== 'string' || !value.sourceAccountId
      || typeof value.targetAccountId !== 'string' || !value.targetAccountId
      || value.sourceAccountId === value.targetAccountId
      || !Number.isFinite(value.amount) || value.amount <= 0 || value.amount > 1_000_000
      || typeof value.note !== 'string' || value.note.length > 240) {
    throw createError({ statusCode: 400, statusMessage: 'Проверьте счета, дату, сумму и заметку.' })
  }
  value.note = value.note.trim()
}

const projection = `SELECT t.id, t.date, t.source_account_id AS sourceAccountId,
  t.target_account_id AS targetAccountId, t.amount, t.note, t.created_at AS createdAt,
  source.name AS sourceAccountName, target.name AS targetAccountName FROM transfers t
  JOIN accounts source ON source.id = t.source_account_id
  JOIN accounts target ON target.id = t.target_account_id`
const list = database.prepare(`${projection} ORDER BY t.date DESC, t.created_at DESC, t.rowid DESC`)
const find = database.prepare(`${projection} WHERE t.id = ?`)
const insert = database.prepare(`INSERT INTO transfers
  (id, source_account_id, target_account_id, date, amount, note) VALUES (?, ?, ?, ?, ?, ?)`)
const accountExists = database.prepare('SELECT 1 FROM accounts WHERE id = ?')
const addBalance = database.prepare('UPDATE accounts SET amount = amount + ? WHERE id = ?')
const subtractBalance = database.prepare('UPDATE accounts SET amount = amount - ? WHERE id = ? AND amount >= ?')

function validateAccounts(draft: TransferDraft) {
  if (!accountExists.get(draft.sourceAccountId) || !accountExists.get(draft.targetAccountId)) {
    throw createError({ statusCode: 404, statusMessage: 'Один из выбранных счетов не найден.' })
  }
}

function debit(accountId: string, amount: number) {
  if (!subtractBalance.run(amount, accountId, amount).changes) {
    throw createError({ statusCode: 409, statusMessage: 'На одном из счетов недостаточно средств для этого перевода.' })
  }
}

export function getTransfers(from?: string, to?: string): TransferRecord[] {
  return (list.all() as TransferRecord[])
    .filter(row => (!from || row.date >= from) && (!to || row.date <= to))
}

export function createTransfer(draft: TransferDraft): TransferRecord {
  const id = randomUUID()
  database.transaction(() => {
    validateAccounts(draft)
    debit(draft.sourceAccountId, draft.amount)
    addBalance.run(draft.amount, draft.targetAccountId)
    insert.run(id, draft.sourceAccountId, draft.targetAccountId, draft.date, draft.amount, draft.note)
  })()
  return find.get(id) as TransferRecord
}

export function updateTransfer(id: string, draft: TransferDraft): TransferRecord | undefined {
  const current = find.get(id) as TransferRecord | undefined
  if (!current) return undefined
  database.transaction(() => {
    validateAccounts(draft)
    if (current.sourceAccountId === draft.sourceAccountId
        && current.targetAccountId === draft.targetAccountId) {
      const difference = draft.amount - current.amount
      if (difference > 0) {
        debit(draft.sourceAccountId, difference)
        addBalance.run(difference, draft.targetAccountId)
      } else if (difference < 0) {
        addBalance.run(-difference, draft.sourceAccountId)
        debit(draft.targetAccountId, -difference)
      }
    } else {
      debit(current.targetAccountId, current.amount)
      addBalance.run(current.amount, current.sourceAccountId)
      debit(draft.sourceAccountId, draft.amount)
      addBalance.run(draft.amount, draft.targetAccountId)
    }
    database.prepare(`UPDATE transfers SET source_account_id = ?, target_account_id = ?, date = ?,
      amount = ?, note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(draft.sourceAccountId, draft.targetAccountId, draft.date, draft.amount, draft.note, id)
  })()
  return find.get(id) as TransferRecord
}

export function deleteTransfer(id: string): boolean {
  const current = find.get(id) as TransferRecord | undefined
  if (!current) return false
  database.transaction(() => {
    debit(current.targetAccountId, current.amount)
    addBalance.run(current.amount, current.sourceAccountId)
    database.prepare('DELETE FROM transfers WHERE id = ?').run(id)
  })()
  return true
}
