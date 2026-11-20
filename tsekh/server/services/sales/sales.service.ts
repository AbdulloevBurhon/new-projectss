import db from '../../database/accounts/accounts.database'
import '../warehouse/stock-receipts.service'
import q from '../../database/sales/queries.json'

db.transaction(()=>db.exec(q.schema)).immediate()
export function salesRequest(path: string, method: string, body: Record<string, any>) {
  const id = body.id
  if (method === 'GET') {
    if (path === 'catalog') return { products: db.prepare(q.catalog).all(), warehouses: db.prepare(q.warehouses).all(), accounts: db.prepare(q.accounts).all() }
    if (path === 'history' || path === 'stock') return db.prepare(q[path]).all()
    if (path === 'clients') return db.prepare(q.clients).all()
    if (path === 'report') return db.prepare(q.report).all()
    if (path.startsWith('receipt/')) return db.prepare(q.detail).all({ id: path.slice(8) })
  }
  if (path === 'movement' && method === 'POST') {
    if (!db.prepare(q.move).run(body).changes) throw Error('Проверьте склад, количество и доступный остаток.')
    return { id }
  }
  if (path === 'clients' && ['POST','PATCH','DELETE'].includes(method)) {
    const sql = method === 'POST' ? q.createClient : method === 'PATCH' ? q.editClient : q.deleteClient
    db.prepare(sql).run(body)
    return { id }
  }
  if (method !== 'POST' || path !== 'checkout') throw createError({statusCode:404})
  return db.transaction(() => {
    if (typeof id !== 'string' || !id || !Array.isArray(body.lines) || !body.lines.length ||
      ![body.discount,body.tender].every(n => Number.isSafeInteger(n) && n >= 0)) throw Error('Некорректная сумма оплаты.')
    if (db.prepare(q.existing).get({id})) return {id}
    db.exec(q.stage)
    const data = {...body, lines: JSON.stringify(body.lines)}
    db.prepare(q.lines).run(data)
    if (!(db.prepare(q.valid).get(data) as {ok:number}).ok) throw Error('Проверьте количество и доступный остаток.')
    db.prepare(q.post).run(data)
    db.prepare(q.copy).run(data)
    db.prepare(q.credit).run(data)
    return {id}
  }).immediate()
}
