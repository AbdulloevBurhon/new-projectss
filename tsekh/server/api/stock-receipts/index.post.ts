import { startStockReceipt } from '../../services/warehouse/stock-receipts.service'

export default defineEventHandler(async event => startStockReceipt(await readBody(event)))
