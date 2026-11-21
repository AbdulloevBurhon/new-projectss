import { getStockReceipts } from '../../services/warehouse/stock-receipts.service'

import { onlyResources } from '../../services/workers/employee-scope'

export default defineEventHandler(event => {
  const result = getStockReceipts()
  const scope = event.context.employee?.resources
  const rows = onlyResources(onlyResources(result.rows, scope, 'warehouses', 'warehouseId'), scope, 'accounts', 'accountId')
  return { ...result, rows }
})
