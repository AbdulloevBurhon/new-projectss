import { deleteWarehouse } from '../../services/warehouses/warehouses.service'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Не указан склад.' })
  if (!deleteWarehouse(id)) throw createError({ statusCode: 404, statusMessage: 'Склад не найден.' })
  return { success: true }
})
