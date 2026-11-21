import database from './stock-receipts.schema'

const projection = `SELECT id, product_id AS productId, warehouse_id AS warehouseId, account_id AS accountId,
  product_name AS productName, warehouse_name AS warehouseName, unit, content_unit AS contentUnit,
  quantity_per_piece AS quantityPerPiece, quantity, unit_price AS unitPrice, sale_price AS salePrice, total, due_at AS dueAt,
  posted_at AS postedAt, status, error, expires_on AS expiresOn FROM stock_receipts`
export const findStockReceipt = database.prepare(`${projection} WHERE id = ?`)
export const list = database.prepare(`${projection} ORDER BY COALESCE(posted_at, due_at) DESC, rowid DESC`)
export const due = database.prepare(`${projection} WHERE status = 'pending' AND due_at <= ? ORDER BY due_at, rowid`)
export const checkDue = database.prepare("SELECT 1 FROM stock_receipts WHERE status = 'pending' AND due_at <= ? LIMIT 1")
export const product = database.prepare('SELECT name, unit, content_unit AS contentUnit, quantity_per_piece AS quantityPerPiece FROM products WHERE id = ?')
export const warehouse = database.prepare('SELECT name FROM warehouses WHERE id = ?')
export const account = database.prepare('SELECT 1 FROM accounts WHERE id = ?')
export const active = database.prepare("SELECT 1 FROM stock_receipts WHERE product_id = ? AND status = 'pending'")
export const insert = database.prepare(`INSERT INTO stock_receipts
  (id, product_id, warehouse_id, account_id, product_name, warehouse_name, unit, content_unit,
   quantity_per_piece, quantity, unit_price, sale_price, total, due_at, expires_on) VALUES
  (@id, @productId, @warehouseId, @accountId, @productName, @warehouseName, @unit, @contentUnit,
   @quantityPerPiece, @quantity, @unitPrice, @salePrice, @total, @dueAt, @expiresOn)`)
export const edit = database.prepare(`UPDATE stock_receipts SET quantity = @quantity, unit_price = @unitPrice,
  sale_price = @salePrice, total = @total, expires_on = @expiresOn WHERE id = @id`)
export const debit = database.prepare(`UPDATE accounts SET amount = ROUND(MAX(0, amount - @total), 2), updated_at = CURRENT_TIMESTAMP
  WHERE id = @accountId AND ROUND(amount, 2) >= @total`)
export const post = database.prepare("UPDATE stock_receipts SET status = 'posted', posted_at = ? WHERE id = ?")
export const fail = database.prepare("UPDATE stock_receipts SET status = 'failed', error = ? WHERE id = ?")
export const discard = database.prepare("DELETE FROM stock_receipts WHERE id = ? AND status <> 'posted'")
