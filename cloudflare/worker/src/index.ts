import type { Env } from './types/env'
import { adminRequest } from './handlers/admin'
import { clientRequest } from './handlers/client'
import { cors, json } from './services/runtime'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const headers = cors(request, env)
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    try {
      const url = new URL(request.url)
      if (url.pathname === '/health') return json({ ok: true, service: 'obshaya-programa-api' }, 200, headers)
      const response = url.pathname.startsWith('/api/v1/admin/')
        ? await adminRequest(request, env, url.pathname)
        : await clientRequest(request, env, url.pathname)
      const merged = new Headers(response.headers)
      for (const [key, value] of Object.entries(headers)) merged.set(key, value)
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers: merged })
    } catch (error) {
      console.error('Worker request failed', error)
      return json({ error: error instanceof Error ? error.message : 'Внутренняя ошибка сервера.' }, 500, headers)
    }
  },
}