import { updateTransfer, type TransferDraft, validateTransferDraft } from '../../../services/transfers/transfers.service'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const draft = await readBody<TransferDraft>(event)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Не указан перевод.' })
  validateTransferDraft(draft)
  const transfer = updateTransfer(id, draft)
  if (!transfer) throw createError({ statusCode: 404, statusMessage: 'Перевод не найден.' })
  return transfer
})
