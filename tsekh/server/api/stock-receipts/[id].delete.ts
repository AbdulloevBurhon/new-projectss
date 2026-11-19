import { discardStockReceipt } from '../../services/warehouse/stock-receipts.service'

export default defineEventHandler(event => discardStockReceipt(getRouterParam(event, 'id')!))
