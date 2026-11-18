import { deleteReceipt } from '../../../services/receipts/receipts.service'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Не указан приход.' })
  if (!deleteReceipt(id)) throw createError({ statusCode: 404, statusMessage: 'Приход не найден.' })
  return { success: true }
})
