import type { ActivationStatus } from '../types/activation.types'
import type { ProductId } from '~~/shared/contracts/product'

export function useActivationApi() {
  const config = useRuntimeConfig()
  const base = String(config.public.licenseApiBase).replace(/\/$/, '')
  async function call<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${base}${path}`, init)
    const result = await response.json().catch(() => ({})) as { error?: string } & T
    if (!response.ok) throw new Error(result.error || `Ошибка сервера (${response.status}).`)
    return result
  }
  return {
    submit: (deviceId: string, productId: ProductId = 'tsekh') => call<{ requestId: string; status: string }>('/api/v1/activation/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceId, productId, appVersion: '1.1.0' }) }),
    status: (id: string) => call<ActivationStatus>(`/api/v1/activation/requests/${encodeURIComponent(id)}`),
  }
}
