import type { Env } from '../types'
import { json } from '../utils/http'

export function requireAdmin(request: Request, env: Env) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!env.ADMIN_API_KEY || token !== env.ADMIN_API_KEY) return json({ error: 'Не авторизован' }, 401)
  return null
}
