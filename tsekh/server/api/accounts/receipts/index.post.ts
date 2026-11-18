import { createReceipt, type ReceiptDraft, validateReceiptDraft } from '../../../services/receipts/receipts.service'

export default defineEventHandler(async (event) => {
  const draft = await readBody<ReceiptDraft>(event)
  validateReceiptDraft(draft)
  try {
    return createReceipt(draft)
  } catch (error) {
    if (String(error).includes('FOREIGN KEY')) {
      throw createError({ statusCode: 404, statusMessage: 'Выбранный счёт не найден.' })
    }
    throw error
  }
})
