import database from '../accounts/accounts.database'

database.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    unit TEXT NOT NULL CHECK(unit IN ('шт','уп','г','кг','м','м²','м³','л','т')),
    content_unit TEXT CHECK(content_unit IS NULL OR content_unit IN ('шт','уп','г','кг','м','м²','м³','л','т')),
    quantity_per_piece REAL CHECK(quantity_per_piece IS NULL OR quantity_per_piece > 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`)

database.transaction(() => {
  const columns = database.pragma('table_info(products)') as { name: string }[]
  if (!columns.some(column => column.name === 'barcode')) {
    database.exec('ALTER TABLE products ADD COLUMN barcode TEXT')
  }
}).immediate()

export default database
