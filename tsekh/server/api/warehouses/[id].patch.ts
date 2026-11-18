import { updateWarehouse, validateWarehouseDraft } from '../../services/warehouses/warehouses.service'
import type { WarehouseDraft } from '../../../endpoints/warehouse/get-warehouses/get-warehouses.types'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Не указан склад.' })
  const body = await readBody(event)
  let draft: WarehouseDraft
  try { draft = validateWarehouseDraft(body) }
  catch (error) { throw createError({ statusCode: 400, statusMessage: error instanceof Error ? error.message : 'Некорректные данные склада.' }) }
  try {
    const row = updateWarehouse(id, draft)
    if (!row) throw createError({ statusCode: 404, statusMessage: 'Склад не найден.' })
    return row
  } catch (error) {
    if (error instanceof Error && !('statusCode' in error)) throw createError({ statusCode: 400, statusMessage: error.message })
    throw error
  }
})
