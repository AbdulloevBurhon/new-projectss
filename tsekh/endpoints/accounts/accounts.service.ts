export interface AccountRecord {
  id: string
  name: string
  amount: number
}

export const accountsKey = 'obshaya:data:tsekh:accounts'

export function getAccounts(): AccountRecord[] {
  const raw = localStorage.getItem(accountsKey)
  if (raw === null) return []

  const rows: unknown = JSON.parse(raw)
  if (!Array.isArray(rows) || rows.some(row => !row || typeof row.id !== 'string'
      || typeof row.name !== 'string' || typeof row.amount !== 'number' || !Number.isFinite(row.amount))) {
    throw new Error('Не удалось прочитать сохранённые счета.')
  }
  return rows
}

export function saveAccounts(rows: AccountRecord[]) {
  localStorage.setItem(accountsKey, JSON.stringify(rows))
}
