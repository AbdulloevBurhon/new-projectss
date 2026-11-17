import { clientApi } from './client-api'
import type { ProductId } from './index'

export interface ClientUpdate {
  id: string
  version: string
  note: string
  sha256: string
}

function isNewerVersion(candidate: string, current: string) {
  if (!/^\d+\.\d+\.\d+$/.test(candidate)) return false
  const installed = current.split('.').map(Number)
  const difference = candidate.split('.').map((part, index) => Number(part) - (installed[index] ?? 0))
    .find(part => part !== 0)
  return (difference ?? 0) > 0
}

export async function findClientUpdate(base: string, version: string, product: ProductId) {
  const updates = await clientApi<ClientUpdate[]>(base, '/api/client/updates', {}, product)
  return updates.reduce<ClientUpdate | undefined>((latest, update) =>
    isNewerVersion(update.version, latest?.version ?? version) ? update : latest, undefined)
}
