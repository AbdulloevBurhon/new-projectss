import type { Env } from './types'
import { handleArchives } from './handlers/admin/archives'
import { handleClients } from './handlers/admin/clients'
import { handleMessages as handleAdminMessages } from './handlers/admin/messages'
import { handleNotes } from './handlers/admin/notes'
import { handleRequests } from './handlers/admin/requests'
import { handleUpdates } from './handlers/admin/updates'
import { handleActivation } from './handlers/client/activation'
import { uploadClientArchive } from './handlers/client/archives'
import { changePin, verifyPin } from './handlers/client/access'
import { handleClientMessages, handleClientSupport } from './handlers/client/messages'
import { listClientUpdates } from './handlers/client/updates'
import { requireAdmin } from './middleware/admin-auth'
import { apiError, corsHeaders, json, notFound } from './utils/http'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
    if (request.method === 'OPTIONS') return new Response(null, { headers: { ...corsHeaders, 'Access-Control-Max-Age': '86400' } })
    const parts = new URL(request.url).pathname.split('/').filter(Boolean)
    if (parts[0] === 'health') return json({ status: 'ok', service: 'obshaya-programma-api' })

    if (parts[0] === 'api' && parts[1] === 'admin') {
      const unauthorized = requireAdmin(request, env)
      if (unauthorized) return unauthorized
      if (parts[2] === 'auth' && request.method === 'GET') return json({ ok: true })
      if (parts[2] === 'requests') return handleRequests(request, env, parts[3])
      if (parts[2] === 'clients') {
        if (parts[4] === 'messages') return handleAdminMessages(request, env, parts[3])
        return handleClients(request, env, parts[3], parts[4])
      }
      if (parts[2] === 'messages' && parts[3]) return handleAdminMessages(request, env, undefined, parts[3])
      if (parts[2] === 'notes') return handleNotes(request, env, parts[3])
      if (parts[2] === 'updates') return handleUpdates(request, env, parts[3], parts[4])
      if (parts[2] === 'archives') return handleArchives(request, env, parts[3], parts[4])
      return notFound()
    }

    if (parts[0] === 'api' && parts[1] === 'client') {
      if (parts[2] === 'activation') return handleActivation(request, env, parts[3])
      if (parts[2] === 'pin' && parts[3] === 'verify' && request.method === 'POST') return verifyPin(request, env)
      if (parts[2] === 'pin' && parts[3] === 'change' && request.method === 'POST') return changePin(request, env)
      if (parts[2] === 'support' && request.method === 'POST') return handleClientSupport(request, env)
      if (parts[2] === 'messages') return handleClientMessages(request, env)
      if (parts[2] === 'updates' && request.method === 'GET') return listClientUpdates(request, env)
      if (parts[2] === 'updates' && parts[3] && parts[4] === 'download') return handleUpdates(request, env, parts[3], 'download', true)
      if (parts[2] === 'updates' && parts[3] && parts[4] === 'receipt') return handleUpdates(request, env, parts[3], 'receipt', true)
      if (parts[2] === 'archives' && request.method === 'POST') return uploadClientArchive(request, env)
    }
    return notFound()
    } catch (error) {
      return apiError(error)
    }
  },
}
