import { getStockReceipts } from '../../services/warehouse/stock-receipts.service'

export default defineEventHandler(() => getStockReceipts())
