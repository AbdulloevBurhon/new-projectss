import database from '../products/products.database'
import warehouseDatabase from '../warehouses/warehouses.database'

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
  if (!columns.some(column => column.name === 'expires_on')) database.exec('ALTER TABLE stock_receipts ADD COLUMN expires_on TEXT')
}).immediate()

for (const [table, column] of [['accounts', 'account_id'], ['warehouses', 'warehouse_id'], ['products', 'product_id']]) {
  warehouseDatabase.exec(`
    CREATE TRIGGER IF NOT EXISTS stock_receipts_protect_${table} BEFORE DELETE ON ${table}
    WHEN EXISTS (SELECT 1 FROM stock_receipts WHERE ${column} = OLD.id AND status = 'pending')
    BEGIN SELECT RAISE(ABORT, 'STOCK_RECEIPT_PENDING'); END;
  `)
}

export default database
