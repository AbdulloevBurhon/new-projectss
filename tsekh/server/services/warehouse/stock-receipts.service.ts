import database from '../../database/products/products.database'
import '../../database/warehouses/warehouses.database'
import type { StockReceipt, StockReceiptAmounts, StockReceiptDraft } from '../../../endpoints/warehouse/stock-receipts/types'

database.exec(`
  CREATE TABLE IF NOT EXISTS stock_receipts (
    id TEXT PRIMARY KEY, product_id TEXT NOT NULL, warehouse_id TEXT NOT NULL, account_id TEXT NOT NULL,
    product_name TEXT NOT NULL, warehouse_name TEXT NOT NULL, unit TEXT NOT NULL,
    content_unit TEXT, quantity_per_piece REAL, quantity REAL, unit_price REAL, sale_price REAL, total REAL,
    due_at INTEGER NOT NULL, posted_at INTEGER, status TEXT NOT NULL DEFAULT 'pending', error TEXT
  );
  CREATE UNIQUE INDEX IF NOT EXISTS stock_receipts_pending_product ON stock_receipts(product_id) WHERE status = 'pending';
  CREATE INDEX IF NOT EXISTS stock_receipts_due ON stock_receipts(due_at) WHERE status = 'pending';
`)

database.transaction(() => {
  const columns = database.pragma('table_info(stock_receipts)') as { name: string }[]
  if (!columns.some(column => column.name === 'sale_price')) {
    database.exec('ALTER TABLE stock_receipts ADD COLUMN sale_price REAL')
  }
}).immediate()

for (const [table, column] of [['accounts', 'account_id'], ['warehouses', 'warehouse_id'], ['products', 'product_id']]) {
  database.exec(`
    CREATE TRIGGER IF NOT EXISTS stock_receipts_protect_${table} BEFORE DELETE ON ${table}
    WHEN EXISTS (SELECT 1 FROM stock_receipts WHERE ${column} = OLD.id AND status = 'pending')
    BEGIN SELECT RAISE(ABORT, 'STOCK_RECEIPT_PENDING'); END;
  `)
}

const projection = `SELECT id, product_id AS productId, warehouse_id AS warehouseId, account_id AS accountId,
  product_name AS productName, warehouse_name AS warehouseName, unit, content_unit AS contentUnit,
  quantity_per_piece AS quantityPerPiece, quantity, unit_price AS unitPrice, sale_price AS salePrice, total, due_at AS dueAt,
  posted_at AS postedAt, status, error FROM stock_receipts`
const find = database.prepare(`${projection} WHERE id = ?`)
const list = database.prepare(`${projection} ORDER BY COALESCE(posted_at, due_at) DESC, rowid DESC`)
const due = database.prepare(`${projection} WHERE status = 'pending' AND due_at <= ? ORDER BY due_at, rowid`)
const checkDue = database.prepare("SELECT 1 FROM stock_receipts WHERE status = 'pending' AND due_at <= ? LIMIT 1")
const product = database.prepare('SELECT name, unit, content_unit AS contentUnit, quantity_per_piece AS quantityPerPiece FROM products WHERE id = ?')
const warehouse = database.prepare('SELECT name FROM warehouses WHERE id = ?')
const account = database.prepare('SELECT 1 FROM accounts WHERE id = ?')
const active = database.prepare("SELECT 1 FROM stock_receipts WHERE product_id = ? AND status = 'pending'")
const insert = database.prepare(`INSERT INTO stock_receipts
  (id, product_id, warehouse_id, account_id, product_name, warehouse_name, unit, content_unit,
   quantity_per_piece, quantity, unit_price, sale_price, total, due_at) VALUES
  (@id, @productId, @warehouseId, @accountId, @productName, @warehouseName, @unit, @contentUnit,
   @quantityPerPiece, @quantity, @unitPrice, @salePrice, @total, @dueAt)`)
const edit = database.prepare(`UPDATE stock_receipts SET quantity = @quantity, unit_price = @unitPrice,
  sale_price = @salePrice, total = @total WHERE id = @id`)
const debit = database.prepare(`UPDATE accounts SET amount = ROUND(MAX(0, amount - @total), 2), updated_at = CURRENT_TIMESTAMP
  WHERE id = @accountId AND ROUND(amount, 2) >= @total`)
const post = database.prepare("UPDATE stock_receipts SET status = 'posted', posted_at = ? WHERE id = ?")
const fail = database.prepare("UPDATE stock_receipts SET status = 'failed', error = ? WHERE id = ?")
const discard = database.prepare("DELETE FROM stock_receipts WHERE id = ? AND status <> 'posted'")

function requestError(statusCode: number, message: string) {
  return createError({ statusCode, message, data: { message } })
}

function readAmounts(value: StockReceiptAmounts) {
  const validNumber = (number: number | null, min: number) =>
    typeof number === 'number' && Number.isFinite(number) && number >= min && number <= 1_000_000
  const quantity = validNumber(value.quantity, 0.001) ? value.quantity : null
  const unitPrice = validNumber(value.unitPrice, 0) ? value.unitPrice : null
  if (value.salePrice != null && !validNumber(value.salePrice, 0)) {
    throw requestError(400, 'Цена продажи должна быть от 0 до 1 000 000 сомони.')
  }
  const salePrice = value.salePrice ?? null
  const total = quantity === null || unitPrice === null ? null : Math.round((quantity * unitPrice + Number.EPSILON) * 100) / 100
  return { quantity, unitPrice, salePrice, total }
}

const settleDue = database.transaction((now: number) => {
  for (const row of due.all(now) as StockReceipt[]) {
    if (row.total === null) fail.run('Проверьте количество и цену закупки.', row.id)
    else if (row.total > 0 && !debit.run({ total: row.total, accountId: row.accountId }).changes) {
      fail.run('Недостаточно средств на счёте.', row.id)
    } else post.run(row.dueAt, row.id)
  }
})

export function processStockReceipts(now = Date.now()) {
  if (checkDue.get(now)) settleDue.immediate(now)
}

export function getStockReceipts() {
  const serverTime = Date.now()
  processStockReceipts(serverTime)
  return { rows: list.all() as StockReceipt[], serverTime }
}

const start = database.transaction((value: StockReceiptDraft & { id: string; productId: string }) => {
  if (typeof value?.id !== 'string' || !/^[a-f0-9-]{36}$/i.test(value.id) || typeof value.productId !== 'string') {
    throw requestError(400, 'Не указан товар.')
  }
  const existing = find.get(value.id) as StockReceipt | undefined
  if (existing) {
    if (existing.productId !== value.productId) throw requestError(409, 'Поступление уже существует.')
    return existing
  }
  const productRow = product.get(value.productId) as Pick<StockReceipt, 'unit' | 'contentUnit' | 'quantityPerPiece'> & { name: string } | undefined
  if (!productRow) throw requestError(404, 'Товар не найден.')
  if (active.get(value.productId)) throw requestError(409, 'Для этого товара уже идёт отсчёт.')
  if (typeof value.warehouseId !== 'string' || !value.warehouseId
    || typeof value.accountId !== 'string' || !value.accountId) {
    throw requestError(400, 'Выберите склад и счёт.')
  }
  const warehouseRow = warehouse.get(value.warehouseId) as { name: string } | undefined
  if (!warehouseRow || !account.get(value.accountId)) throw requestError(404, 'Выбранный склад или счёт не найден.')
  const draft = readAmounts(value)
  if (draft.total === null) throw requestError(400, 'Укажите количество и цену закупки.')
  insert.run({
    ...draft, ...productRow, id: value.id, productId: value.productId, productName: productRow.name,
    warehouseId: value.warehouseId, warehouseName: warehouseRow.name, accountId: value.accountId,
    dueAt: Date.now() + 120_000,
  })
  return find.get(value.id) as StockReceipt
})

export function startStockReceipt(value: StockReceiptDraft & { id: string; productId: string }) {
  processStockReceipts()
  return start.immediate(value)
}

type StockReceiptEdit = StockReceiptAmounts & Partial<Pick<StockReceiptDraft, 'warehouseId' | 'accountId'>>

const change = database.transaction((id: string, value: StockReceiptEdit) => {
  const row = find.get(id) as StockReceipt | undefined
  if (!row) throw requestError(404, 'Поступление не найдено.')
  if (row.status !== 'pending' || row.dueAt <= Date.now()) throw requestError(409, 'Время редактирования истекло.')
  if (!value || typeof value !== 'object') throw requestError(400, 'Проверьте данные поступления.')
  if ((Object.hasOwn(value, 'warehouseId') && value.warehouseId !== row.warehouseId)
    || (Object.hasOwn(value, 'accountId') && value.accountId !== row.accountId)) {
    throw requestError(409, 'Склад и счёт фиксируются при запуске отсчёта.')
  }
  edit.run({ id, ...readAmounts(value) })
  return find.get(id) as StockReceipt
})

export function updateStockReceipt(id: string, value: StockReceiptEdit) {
  processStockReceipts()
  return change.immediate(id, value)
}

export function discardStockReceipt(id: string) {
  processStockReceipts()
  return database.transaction(() => {
    const row = find.get(id) as StockReceipt | undefined
    if (row?.status === 'posted' || (row?.status === 'pending' && row.dueAt <= Date.now())) {
      throw requestError(409, 'Время отмены истекло.')
    }
    discard.run(id)
    return { success: true }
  }).immediate()
}
