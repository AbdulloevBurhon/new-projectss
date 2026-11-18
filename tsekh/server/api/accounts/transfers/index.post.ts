import { createTransfer, type TransferDraft, validateTransferDraft } from '../../../services/transfers/transfers.service'

export default defineEventHandler(async (event) => {
  const draft = await readBody<TransferDraft>(event)
  validateTransferDraft(draft)
  return createTransfer(draft)
})
