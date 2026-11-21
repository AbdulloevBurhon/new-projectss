import { workerRequest } from '../../services/workers/workers.service'

export default defineEventHandler(async event => {
  const method = getMethod(event)
  const body = method === 'POST' ? await readBody(event) : {}
  return workerRequest('', method, body ?? {}, getCookie(event, 'tsekh_employee_session'))
})
