import database from '../../database/accounts/accounts.database'
import '../sales/sales.service'
import queries from '../../database/sales/queries'
import type { PostedStockReceiptEdit, StockReceipt } from '../../../endpoints/warehouse/stock-receipts/types'
import { findStockReceipt, processStockReceipts, readAmounts, requestError } from './stock-receipts.service'

const canReduceStock = database.prepare(queries.canReduceReceiptStock)
const adjustAccount = database.prepare(queries.adjustReceiptAccount)
const accountExists = database.prepare('SELECT 1 FROM accounts WHERE id = ?')
const update = database.prepare(`UPDATE stock_receipts SET quantity = @quantity, unit_price = @unitPrice,
  sale_price = @salePrice, total = @total, account_id = @accountId WHERE id = @id`)
const remove = database.prepare('DELETE FROM stock_receipts WHERE id = ?')

function adjustBalance(accountId: string, delta: number, source: boolean) {
  if (delta === 0 || adjustAccount.run({ delta, accountId }).changes) return
  const message = accountExists.get(accountId)
    ? (source ? 'Недостаточно средств на исходном счёте.' : 'Недостаточно средств на выбранном счёте.')
    : (source ? 'Исходный счёт удалён.' : 'Выбранный счёт не найден.')
  throw requestError(409, message)
}

const changePostedReceipt = database.transaction((id: string, action: 'edit' | 'delete', value?: PostedStockReceiptEdit) => {
  const row = findStockReceipt.get(id) as StockReceipt | undefined
  if (!row) throw requestError(404, 'Поступление не найдено.')
  if (row.status !== 'posted') throw requestError(409, 'Поступление ещё не проведено.')
  const deleting = action === 'delete'
  if (!deleting && (!value || typeof value !== 'object' || Array.isArray(value))) {
    throw requestError(400, 'Проверьте данные поступления.')
  }

  let accountId = row.accountId
  if (value && Object.hasOwn(value, 'accountId')) {
    if (typeof value.accountId !== 'string' || !value.accountId.trim()) {
      throw requestError(400, 'Выберите счёт.')
    }
    accountId = value.accountId
    if (!accountExists.get(accountId)) throw requestError(409, 'Выбранный счёт не найден.')
  }

  const amounts = deleting ? { quantity: 0, total: 0 } : readAmounts(value!)
  if (amounts.quantity === null || amounts.total === null) {
    throw requestError(400, 'Укажите количество и цену закупки.')
  }
  const reduction = (row.quantity ?? 0) - amounts.quantity
  if (reduction > 0 && !canReduceStock.get({ id, reduction })) {
    throw requestError(409, 'Недостаточно товара на складе для изменения поступления.')
  }

  const previousCents = Math.round((row.total ?? 0) * 100)
  const nextCents = Math.round(amounts.total * 100)
  if (accountId === row.accountId) {
    adjustBalance(accountId, (nextCents - previousCents) / 100, true)
  } else {
    adjustBalance(row.accountId, -previousCents / 100, true)
    adjustBalance(accountId, nextCents / 100, false)
  }

  if (deleting) {
    remove.run(id)
    return { success: true }
  }
  update.run({ id, accountId, ...amounts })
  return findStockReceipt.get(id) as StockReceipt
})

export function editPostedStockReceipt(id: string, value: PostedStockReceiptEdit) {
  processStockReceipts()
  return changePostedReceipt.immediate(id, 'edit', value)
}

export function deletePostedStockReceipt(id: string) {
  processStockReceipts()
  return changePostedReceipt.immediate(id, 'delete')
}
