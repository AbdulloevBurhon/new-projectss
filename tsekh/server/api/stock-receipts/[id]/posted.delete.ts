import { deletePostedStockReceipt } from '../../../services/warehouse/posted-stock-receipts.service'

export default defineEventHandler(event => deletePostedStockReceipt(getRouterParam(event, 'id')!))
