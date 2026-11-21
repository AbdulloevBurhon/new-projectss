import db from '../../database/warehouse/stock-receipts.schema'
import q from '../../database/sales/queries'
import { allowsResource, onlyResources, type Scope } from '../workers/employee-scope'
import { workerError } from '../workers/workers.service'
import type { SaleGoods } from '../../../endpoints/sales/service'
import { barcodeMaxLength } from '../../../endpoints/warehouse/products/products.types'

const pageSize = 15
const read = (sql: string) => db.prepare(sql).all() as Record<string, unknown>[]
const text = (value: unknown) => typeof value === 'string' ? value : ''

export function salesCatalog(query: Record<string, unknown>, scope: Scope) {
  const view = text(query.view)
  if (!view || view === 'setup') return {
    products: view ? [] : onlyResources(read(q.catalog), scope, 'warehouses', 'warehouse'),
    warehouses: onlyResources(read(q.warehouses), scope, 'warehouses', 'id'),
    accounts: onlyResources(read(q.accounts), scope, 'accounts', 'id'),
  }
  const warehouse = text(query.warehouse)
  if (!warehouse || !allowsResource(scope, 'warehouses', warehouse)) throw workerError(403, 'Нет доступа к выбранному складу.')
  if (view === 'barcode') {
    const code = text(query.code).trim()
    if (!code || code.length > barcodeMaxLength) throw workerError(400, 'Проверьте штрихкод.')
    return db.prepare(q.catalogBarcode).all({ warehouse, code })
  }
  if (view !== 'page') throw workerError(400, 'Неизвестный режим каталога.')
  const search = text(query.search).trim().toLowerCase()
  const page = db.prepare(q.catalogPage).all({
    warehouse, afterId: text(query.afterId), afterName: text(query.afterName), limit: search ? -1 : pageSize + 1,
  }) as SaleGoods[]
  const rows = search ? page.filter(row => row.name.toLowerCase().includes(search)) : page
  return { rows: rows.slice(0, pageSize), more: rows.length > pageSize }
}
