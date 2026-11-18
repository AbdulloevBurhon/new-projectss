import { deleteTransfer } from '../../../services/transfers/transfers.service'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Не указан перевод.' })
  if (!deleteTransfer(id)) throw createError({ statusCode: 404, statusMessage: 'Перевод не найден.' })
  return { success: true }
})
