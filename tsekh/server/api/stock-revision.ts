import { revisionRequest } from '../services/warehouse/revision.service'

export default defineEventHandler(async event => {
  setHeader(event, 'Cache-Control', 'no-store')
  const access = getCookie(event, 'tsekh_pin_access')
  if (access !== '1' && access !== '"1"') throw createError({ statusCode: 403, message: 'Войдите в «Цех», чтобы открыть ревизию.' })
  const method = getMethod(event)
  if (method !== 'GET' && method !== 'POST') throw createError({ statusCode: 405 })
  return revisionRequest(method, method === 'GET' ? getQuery(event) : await readBody(event), event.context.employee)
})
