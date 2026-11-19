import { updateStockReceipt } from '../../services/warehouse/stock-receipts.service'

export default defineEventHandler(async event => updateStockReceipt(getRouterParam(event, 'id')!, await readBody(event)))
