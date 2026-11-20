import { randomUUID } from 'node:crypto'
import database from '../../database/accounts/accounts.database'

export interface ReceiptDraft {
  date: string
  accountId: string
  amount: number
  note: string
}

export interface ReceiptRecord extends ReceiptDraft {
  id: string
  createdAt: string
  accountName: string
}

export function validateReceiptDraft(value: ReceiptDraft) {
  const date = typeof value?.date === 'string' ? new Date(`${value.date}T00:00:00.000Z`) : null
  const validDate = date && !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value.date
  if (!validDate || typeof value.accountId !== 'string' || !value.accountId
      || !Number.isFinite(value.amount) || value.amount <= 0 || value.amount > 1_000_000 || Number(value.amount.toFixed(2)) !== value.amount
      || typeof value.note !== 'string' || value.note.length > 240) {
    throw createError({ statusCode: 400, statusMessage: 'Проверьте счёт, дату, сумму и заметку.' })
  }
  value.note = value.note.trim()
}

const projection = `SELECT r.id, r.date, r.account_id AS accountId, r.amount, r.note,
  r.created_at AS createdAt, a.name AS accountName FROM receipts r
  JOIN accounts a ON a.id = r.account_id`
const list = database.prepare(`${projection} ORDER BY r.date DESC, r.created_at DESC, r.rowid DESC`)
const find = database.prepare(`${projection} WHERE r.id = ?`)
const insert = database.prepare('INSERT INTO receipts (id, account_id, date, amount, note) VALUES (?, ?, ?, ?, ?)')
const addBalance = database.prepare('UPDATE accounts SET amount = (CAST(ROUND(amount*100) AS INTEGER) + CAST(ROUND(?*100) AS INTEGER))/100.0 WHERE id = ?')
const subtractBalance = database.prepare('UPDATE accounts SET amount = (CAST(ROUND(amount*100) AS INTEGER) - CAST(ROUND(?*100) AS INTEGER))/100.0 WHERE id = ?')

export function getReceipts(from?: string, to?: string): ReceiptRecord[] {
  const rows = list.all() as ReceiptRecord[]
  return rows.filter(row => (!from || row.date >= from) && (!to || row.date <= to))
}

export function createReceipt(draft: ReceiptDraft): ReceiptRecord {
  const id = randomUUID()
  database.transaction(() => {
    insert.run(id, draft.accountId, draft.date, draft.amount, draft.note)
    addBalance.run(draft.amount, draft.accountId)
  })()
  return find.get(id) as ReceiptRecord
}

export function updateReceipt(id: string, draft: ReceiptDraft): ReceiptRecord | undefined {
  const current = find.get(id) as ReceiptRecord | undefined
  if (!current) return undefined
  database.transaction(() => {
    subtractBalance.run(current.amount, current.accountId)
    addBalance.run(draft.amount, draft.accountId)
    database.prepare(`UPDATE receipts SET account_id = ?, date = ?, amount = ?, note = ?,
      updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(draft.accountId, draft.date, draft.amount, draft.note, id)
  })()
  return find.get(id) as ReceiptRecord
}

export function deleteReceipt(id: string): boolean {
  const current = find.get(id) as ReceiptRecord | undefined
  if (!current) return false
  database.transaction(() => {
    subtractBalance.run(current.amount, current.accountId)
    database.prepare('DELETE FROM receipts WHERE id = ?').run(id)
  })()
  return true
}
