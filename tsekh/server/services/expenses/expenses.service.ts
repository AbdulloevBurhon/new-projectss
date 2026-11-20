import { randomUUID } from 'node:crypto'
import database from '../../database/accounts/accounts.database'

export interface ExpenseDraft {
  date: string
  accountId: string
  amount: number
  note: string
}

export interface ExpenseRecord extends ExpenseDraft {
  id: string
  createdAt: string
  accountName: string
}

export function validateExpenseDraft(value: ExpenseDraft) {
  const date = typeof value?.date === 'string' ? new Date(`${value.date}T00:00:00.000Z`) : null
  const validDate = date && !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value.date
  if (!validDate || typeof value.accountId !== 'string' || !value.accountId
      || !Number.isFinite(value.amount) || value.amount <= 0 || value.amount > 1_000_000 || Number(value.amount.toFixed(2)) !== value.amount
      || typeof value.note !== 'string' || value.note.length > 240) {
    throw createError({ statusCode: 400, statusMessage: 'Проверьте счёт, дату, сумму и заметку.' })
  }
  value.note = value.note.trim()
}

const projection = `SELECT e.id, e.date, e.account_id AS accountId, e.amount, e.note,
  e.created_at AS createdAt, a.name AS accountName FROM expenses e
  JOIN accounts a ON a.id = e.account_id`
const list = database.prepare(`${projection} ORDER BY e.date DESC, e.created_at DESC, e.rowid DESC`)
const find = database.prepare(`${projection} WHERE e.id = ?`)
const insert = database.prepare('INSERT INTO expenses (id, account_id, date, amount, note) VALUES (?, ?, ?, ?, ?)')
const addBalance = database.prepare('UPDATE accounts SET amount = (CAST(ROUND(amount*100) AS INTEGER) + CAST(ROUND(?*100) AS INTEGER))/100.0 WHERE id = ?')
const subtractBalance = database.prepare('UPDATE accounts SET amount = (CAST(ROUND(amount*100) AS INTEGER) - CAST(ROUND(?*100) AS INTEGER))/100.0 WHERE id = ? AND ROUND(amount*100) >= ROUND(?*100)')
const accountExists = database.prepare('SELECT 1 FROM accounts WHERE id = ?')

function ensureFunds(accountId: string, amount: number) {
  if (!accountExists.get(accountId)) throw createError({ statusCode: 404, statusMessage: 'Выбранный счёт не найден.' })
  if (!subtractBalance.run(amount, accountId, amount).changes) {
    throw createError({ statusCode: 409, statusMessage: 'Недостаточно денег на выбранном счёте.' })
  }
}

export function getExpenses(from?: string, to?: string): ExpenseRecord[] {
  return (list.all() as ExpenseRecord[])
    .filter(row => (!from || row.date >= from) && (!to || row.date <= to))
}

export function createExpense(draft: ExpenseDraft): ExpenseRecord {
  const id = randomUUID()
  database.transaction(() => {
    ensureFunds(draft.accountId, draft.amount)
    insert.run(id, draft.accountId, draft.date, draft.amount, draft.note)
  })()
  return find.get(id) as ExpenseRecord
}

export function updateExpense(id: string, draft: ExpenseDraft): ExpenseRecord | undefined {
  const current = find.get(id) as ExpenseRecord | undefined
  if (!current) return undefined
  database.transaction(() => {
    addBalance.run(current.amount, current.accountId)
    ensureFunds(draft.accountId, draft.amount)
    database.prepare(`UPDATE expenses SET account_id = ?, date = ?, amount = ?, note = ?,
      updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(draft.accountId, draft.date, draft.amount, draft.note, id)
  })()
  return find.get(id) as ExpenseRecord
}

export function deleteExpense(id: string): boolean {
  const current = find.get(id) as ExpenseRecord | undefined
  if (!current) return false
  database.transaction(() => {
    addBalance.run(current.amount, current.accountId)
    database.prepare('DELETE FROM expenses WHERE id = ?').run(id)
  })()
  return true
}
