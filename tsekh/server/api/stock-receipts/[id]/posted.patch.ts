import { editPostedStockReceipt } from '../../../services/warehouse/posted-stock-receipts.service'

export default defineEventHandler(async event => editPostedStockReceipt(getRouterParam(event, 'id')!, await readBody(event)))
