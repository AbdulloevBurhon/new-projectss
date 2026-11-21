import { permits, type Right } from '../../endpoints/workers/permissions'
import { currentWorker, workerError } from '../services/workers/workers.service'
import { restrictEmployeeResources } from '../services/workers/employee-scope'

export default defineEventHandler(async event => {
  const parts = getRequestURL(event).pathname.split('/').filter(Boolean)
  const [root, resource, action, id, detail] = parts
  if (root !== 'api' || resource === 'workers') return
  const token = getCookie(event, 'tsekh_employee_session')
  if (!token) return
  const worker = currentWorker(token)!
  event.context.employee = worker
  const has = (right: Right) => permits(worker.permissions, right)
  const method = getMethod(event)
  const read = method === 'GET'
  const section = resource === 'accounts' ? 'accounts'
    : ['warehouses', 'products', 'stock-receipts'].includes(resource) ? 'warehouses' : null
  let allowed = false
  if (section && action !== 'migrate') {
    allowed = method === 'PATCH' ? has(`${section}.edit`)
      : method === 'DELETE' ? has(`${section}.delete`) : has(section)
  }
  if (resource === 'sales') {
    if (action === 'catalog' && read) allowed = has('sales')
    if (read && ['stock', 'history', 'warehouse-accounts'].includes(action ?? '')) allowed = has('warehouses')
    if (action === 'movement' && method === 'POST') allowed = has('warehouses.edit')
    if (action === 'checkout') allowed = has('sales')
    if (action === 'clients') {
      if (id) allowed = detail === 'payments' ? method === 'POST' && has('clients.pay') && has('accounts')
        : read && !detail && has('clients')
      else allowed = read ? has('clients') || has('sales')
        : method === 'PATCH' ? has('clients.edit') : method === 'DELETE' ? has('clients.delete') : has('clients')
    }
    if (action === 'report') allowed = has('reports')
    if (action === 'receipt' && read) allowed = has('reports') || has('sales')
  }
  if (resource === 'telegram-scheduled' && action === 'run' && parts.length === 3 && method === 'POST') allowed = true
  if (resource === 'summary' && !action && read) allowed = has('summary')
  if (resource === 'stock-revision' && !action) allowed = has('warehouses')
  if (resource === 'stock-expiry' && !action) allowed = read ? has('warehouses') : method === 'PATCH' && has('warehouses.edit')
  if (!allowed) throw workerError(403, 'У вас нет прав для этого действия.')
  await restrictEmployeeResources(event, worker, parts)
})
