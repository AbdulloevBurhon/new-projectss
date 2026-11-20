import database from '../../database/accounts/accounts.database'
import '../warehouse/stock-receipts.service'
import { barcodeMaxLength } from '../../../endpoints/warehouse/products/products.types'

const tables = ['accounts', 'warehouses', 'products', 'receipts', 'expenses', 'transfers', 'stock_receipts'] as const
type Column = { name: string; type: string; notnull: number; pk: number }
const schema = tables.map(table => {
  const columns = database.pragma(`table_info(${table})`) as Column[]
  const names = columns.map(column => column.name)
  return {
    table, columns,
    select: database.prepare(`SELECT * FROM ${table} ORDER BY rowid`),
    clear: database.prepare(`DELETE FROM ${table}`),
    insert: database.prepare(`INSERT INTO ${table} (${names.join(',')}) VALUES (${names.map(name => '@' + name).join(',')})`),
  }
})
const invalidStock = database.prepare(`SELECT 1 FROM stock_receipts s WHERE
  s.status NOT IN ('pending','posted','failed') OR
  (s.status = 'posted' AND (s.posted_at IS NULL OR s.quantity IS NULL OR s.quantity <= 0 OR
    s.unit_price IS NULL OR s.unit_price < 0 OR s.total IS NULL OR s.total < 0)) OR
  (s.status = 'pending' AND (NOT EXISTS (SELECT 1 FROM accounts WHERE id=s.account_id)
    OR NOT EXISTS (SELECT 1 FROM warehouses WHERE id=s.warehouse_id)
    OR NOT EXISTS (SELECT 1 FROM products WHERE id=s.product_id))) LIMIT 1`)

export const exportDatabase = database.transaction(() => ({
  version: 1,
  tables: Object.fromEntries(schema.map(({ table, select }) => [table, select.all()])),
}))

function invalidArchive() {
  const message = 'Архив SQLite содержит некорректные данные.'
  return createError({ statusCode: 400, message, data: { message } })
}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function validateRows(rows: unknown, columns: Column[], table: typeof tables[number]) {
  if (!Array.isArray(rows)) throw invalidArchive()
  return rows.map((row: unknown) => {
    if (!record(row)) throw invalidArchive()
    const legacyProduct = table === 'products' && !Object.hasOwn(row, 'barcode')
    if (Object.keys(row).length !== columns.length - Number(legacyProduct)) throw invalidArchive()
    const validated: Record<string, string | number | null> = {}
    for (const { name, type, notnull, pk } of columns) {
      if (name === 'barcode' && legacyProduct) { validated[name] = null; continue }
      if (!Object.hasOwn(row, name)) throw invalidArchive()
      const value = row[name]
      if (value === null && !notnull && !pk) validated[name] = null
      else if (type === 'TEXT' && typeof value === 'string' && (!pk || value.length > 0)
        && (name !== 'barcode' || value.length <= barcodeMaxLength)) validated[name] = value
      else if (typeof value === 'number' && (type === 'INTEGER' ? Number.isSafeInteger(value) : type === 'REAL' && Number.isFinite(value))) validated[name] = value
      else throw invalidArchive()
    }
    return validated
  })
}

const replaceDatabase = database.transaction((snapshot: ReturnType<typeof validateRows>[]) => {
  // Clear child tables first so pending receipts and foreign keys cannot block parent rows.
  for (const { clear } of [...schema].reverse()) clear.run()
  schema.forEach(({ insert }, index) => snapshot[index]!.forEach(row => insert.run(row)))
  if (invalidStock.get()) throw invalidArchive()
})

export function importDatabase(value: unknown) {
  if (!record(value) || value.version !== 1 || !record(value.tables)) throw invalidArchive()
  const source = value.tables
  if (Object.keys(source).length !== tables.length) throw invalidArchive()
  const snapshot = schema.map(({ table, columns }) => validateRows(source[table], columns, table))
  try { replaceDatabase.immediate(snapshot) }
  catch (error) {
    if (String((error as { code?: string }).code).startsWith('SQLITE_CONSTRAINT')) throw invalidArchive()
    throw error
  }
  return { success: true }
}
