import { createWarehouse, validateWarehouseDraft } from '../../services/warehouses/warehouses.service'
import type { WarehouseDraft } from '../../../endpoints/warehouse/get-warehouses/get-warehouses.types'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  let draft: WarehouseDraft
  try { draft = validateWarehouseDraft(body) }
  catch (error) { throw createError({ statusCode: 400, statusMessage: error instanceof Error ? error.message : 'Некорректные данные склада.' }) }
  return createWarehouse(draft)
})
