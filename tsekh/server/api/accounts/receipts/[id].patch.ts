import { updateReceipt, type ReceiptDraft, validateReceiptDraft } from '../../../services/receipts/receipts.service'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const draft = await readBody<ReceiptDraft>(event)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Не указан приход.' })
  validateReceiptDraft(draft)
  try {
    const receipt = updateReceipt(id, draft)
    if (!receipt) throw createError({ statusCode: 404, statusMessage: 'Приход не найден.' })
    return receipt
  } catch (error) {
    if (String(error).includes('FOREIGN KEY')) {
      throw createError({ statusCode: 404, statusMessage: 'Выбранный счёт не найден.' })
    }
    throw error
  }
})
