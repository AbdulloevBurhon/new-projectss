import { workerRequest } from '../../services/workers/workers.service'

export default defineEventHandler(async event => {
  const path = getRouterParam(event, 'path') ?? ''
  if (path === 'session') setHeader(event, 'Cache-Control', 'no-store')
  const method = getMethod(event)
  const body = method === 'POST' || method === 'PATCH' ? await readBody(event) : {}
  return workerRequest(path, method, body ?? {}, getCookie(event, 'tsekh_employee_session'), getQuery(event))
})
