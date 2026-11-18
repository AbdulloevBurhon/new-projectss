import { randomUUID } from 'node:crypto'
import database from '../../database/warehouses/warehouses.database'
import { warehouseTypeLabels, type Warehouse, type WarehouseDraft } from '../../../endpoints/warehouse/get-warehouses/get-warehouses.types'

const list = database.prepare('SELECT id,name,type FROM warehouses ORDER BY created_at DESC,rowid DESC')
const find = database.prepare('SELECT id,name,type FROM warehouses WHERE id=?')
const insert = database.prepare('INSERT INTO warehouses (id,name,type) VALUES (?,?,?)')
const update = database.prepare('UPDATE warehouses SET name=?,type=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')
const remove = database.prepare('DELETE FROM warehouses WHERE id=?')
const count = database.prepare('SELECT COUNT(*) AS total FROM warehouses')
const importRow = database.prepare('INSERT INTO warehouses (id,name,type) VALUES (@id,@name,@type)')

function record(row: unknown) {
  const value = row as Warehouse
  return { ...value, type: value.type ?? undefined }
}

export function validateWarehouseDraft(value: unknown): WarehouseDraft {
  const draft = value as Partial<WarehouseDraft> | null
  const name = typeof draft?.name === 'string' ? draft.name.trim() : ''
  if (!name || name.length > 120) throw new Error('Название склада должно содержать от 1 до 120 символов.')
  if (!draft?.type || !Object.hasOwn(warehouseTypeLabels, draft.type)) throw new Error('Выберите тип склада.')
  return { name, type: draft.type }
}

export function getWarehouses(): Warehouse[] {
  return (list.all() as Warehouse[]).map(record)
}

export function createWarehouse(draft: WarehouseDraft): Warehouse {
  const id = randomUUID()
  insert.run(id, draft.name, draft.type)
  return record(find.get(id))
}

export function updateWarehouse(id: string, draft: WarehouseDraft): Warehouse | undefined {
  if (!update.run(draft.name, draft.type, id).changes) return undefined
  return record(find.get(id))
}

export function deleteWarehouse(id: string) { return remove.run(id).changes > 0 }

export function migrateWarehouses(rows: Warehouse[]) {
  if ((count.get() as { total: number }).total) return false
  database.transaction((items: Warehouse[]) => items.forEach(row => importRow.run({ ...row, type: row.type ?? null })))(rows)
  return true
}
