import { salesRequest } from '../../services/sales/sales.service'
export default defineEventHandler(async event => {
  const method = getMethod(event)
  const body = method === 'GET' ? getQuery(event) : await readBody(event)
  try { return salesRequest(getRouterParam(event,'path') ?? '', method, body, event.context.employee) }
  catch (error) {
    if ((error as { statusCode?: number }).statusCode) throw error
    const message = error instanceof Error && error.message.startsWith('Проверьте') ? error.message : 'Проверьте данные операции. Удалить клиента с продажами нельзя.'
    throw createError({ statusCode:409, message, data:{message} })
  }
})
