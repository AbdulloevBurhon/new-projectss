import database from '../../database/products/products.database'
import '../sales/sales.service'
import { stockReceiptDelaySeconds, type StockReceipt, type StockReceiptAmounts, type StockReceiptDraft } from '../../../endpoints/warehouse/stock-receipts/types'
import { findStockReceipt, list, due, checkDue, product, warehouse, account, active, insert, edit, debit, post, fail, discard } from '../../database/warehouse/stock-receipts.queries'

export { findStockReceipt }

export function requestError(statusCode: number, message: string) {
  return createError({ statusCode, message, data: { message } })
}

export function readExpiry(value: unknown) {
  if (value == null || value === '') return null
  if (typeof value === 'string' && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value) && !value.startsWith('0000')) {
    const date = new Date(value + 'T00:00:00Z')
    if (Number.isFinite(+date) && date.toISOString().slice(0, 10) === value) return value
  }
  throw requestError(400, 'Проверьте срок годности.')
}

export function readAmounts(value: StockReceiptAmounts) {
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
  const existing = findStockReceipt.get(value.id) as StockReceipt | undefined
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
    dueAt: Date.now() + stockReceiptDelaySeconds * 1000, expiresOn: readExpiry(value.expiresOn),
  })
  return findStockReceipt.get(value.id) as StockReceipt
})

export function startStockReceipt(value: StockReceiptDraft & { id: string; productId: string }) {
  processStockReceipts()
  return start.immediate(value)
}

type StockReceiptEdit = StockReceiptAmounts & Partial<Pick<StockReceiptDraft, 'warehouseId' | 'accountId'>>

const change = database.transaction((id: string, value: StockReceiptEdit) => {
  const row = findStockReceipt.get(id) as StockReceipt | undefined
  if (!row) throw requestError(404, 'Поступление не найдено.')
  if (row.status !== 'pending' || row.dueAt <= Date.now()) throw requestError(409, 'Время редактирования истекло.')
  if (!value || typeof value !== 'object') throw requestError(400, 'Проверьте данные поступления.')
  if ((Object.hasOwn(value, 'warehouseId') && value.warehouseId !== row.warehouseId)
    || (Object.hasOwn(value, 'accountId') && value.accountId !== row.accountId)) {
    throw requestError(409, 'Склад и счёт фиксируются при запуске отсчёта.')
  }
  edit.run({ id, ...readAmounts(value), expiresOn: readExpiry(value.expiresOn === undefined ? row.expiresOn : value.expiresOn) })
  return findStockReceipt.get(id) as StockReceipt
})

export function updateStockReceipt(id: string, value: StockReceiptEdit) {
  processStockReceipts()
  return change.immediate(id, value)
}

export function discardStockReceipt(id: string) {
  processStockReceipts()
  return database.transaction(() => {
    const row = findStockReceipt.get(id) as StockReceipt | undefined
    if (row?.status === 'posted' || (row?.status === 'pending' && row.dueAt <= Date.now())) {
      throw requestError(409, 'Время отмены истекло.')
    }
    discard.run(id)
    return { success: true }
  }).immediate()
}
