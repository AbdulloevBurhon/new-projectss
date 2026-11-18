import { migrateWarehouses } from '../../services/warehouses/warehouses.service'
import { warehouseTypeLabels, type Warehouse } from '../../../endpoints/warehouse/get-warehouses/get-warehouses.types'

export default defineEventHandler(async (event) => {
  const rows = (await readBody<{ warehouses?: unknown }>(event))?.warehouses
  if (!Array.isArray(rows) || rows.length > 1000 || rows.some(row => !validWarehouse(row))) {
    throw createError({ statusCode: 400, statusMessage: 'Некорректные сохранённые склады.' })
  }
  try { return { migrated: migrateWarehouses(rows) } }
  catch (error) {
    if (String(error).includes('UNIQUE')) throw createError({ statusCode: 409, statusMessage: 'Среди сохранённых складов есть повторяющиеся идентификаторы.' })
    throw error
  }
})

function validWarehouse(value: unknown): value is Warehouse {
  if (!value || typeof value !== 'object') return false
  const row = value as Partial<Warehouse>
  return typeof row.id === 'string' && row.id.length > 0 && row.id.length <= 100
    && typeof row.name === 'string' && row.name.trim().length > 0 && row.name.trim().length <= 120
    && (row.type == null || Object.hasOwn(warehouseTypeLabels, row.type))
}
