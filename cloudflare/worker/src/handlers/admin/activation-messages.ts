import type { Env } from '../../types'
import { json } from '../../utils/http'

export async function handleActivationMessages(_request: Request, env: Env) {
  const result = await env.DB.prepare(`SELECT id, installation_id AS installationId, product AS productId,
    body, created_at AS receivedAt FROM app_activation_messages ORDER BY created_at DESC LIMIT 100`).all()
  return json(result.results)
}
