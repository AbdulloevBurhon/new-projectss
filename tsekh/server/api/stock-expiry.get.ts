import db from '../database/warehouse/stock-receipts.schema'
import q from '../database/sales/queries'
import { processStockReceipts } from '../services/warehouse/stock-receipts.service'
import { onlyResources } from '../services/workers/employee-scope'
import type { StockExpiryRow } from '../../endpoints/warehouse/stock-receipts/expiry'

export default defineEventHandler(event => {
  setHeader(event, 'Cache-Control', 'no-store')
  processStockReceipts()
  return onlyResources(db.prepare(q.expiryRows).all() as StockExpiryRow[], event.context.employee?.resources, 'warehouses', 'warehouse')
})
