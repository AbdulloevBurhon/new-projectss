export function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return Response.json(data, { status, headers: { ...corsHeaders, ...headers } })
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Installation-Id, X-Client-Pin',
  'Access-Control-Expose-Headers': 'Content-Disposition, X-Content-SHA256',
  'Access-Control-Max-Age': '86400',
}

export async function readJson<T>(request: Request): Promise<T> {
  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) throw new Error('Ожидается JSON-запрос')
  return await request.json() as T
}

export function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Внутренняя ошибка сервера'
  const status = message === 'Не авторизован' ? 401 : message.startsWith('Ожидается') ? 415 : 500
  return json({ error: status === 500 ? 'Внутренняя ошибка сервера' : message }, status)
}

export function notFound() { return json({ error: 'Маршрут не найден' }, 404) }
