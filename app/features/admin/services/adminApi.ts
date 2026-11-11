import type { AdminMessage, AdminOverview, ProductId } from '../types/admin.types'

const API_ROOT = '/api/v1/admin'

export function useAdminApi() {
  const config = useRuntimeConfig()
  const base = String(config.public.licenseApiBase).replace(/\/$/, '')

  async function login(key: string) {
    const response = await fetch(`${base}${API_ROOT}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: key.trim() }),
    })
    // Keep the existing deployed API usable until the new Worker is deployed.
    if (response.status === 404) return key.trim()
    const result = await response.json().catch(() => ({})) as { token?: string; error?: string }
    if (!response.ok || !result.token) throw new Error(result.error || `Ошибка входа (${response.status}).`)
    return result.token
  }

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const key = import.meta.client ? sessionStorage.getItem('obshaya-admin-key') : null
    if (!key) throw new Error('Войдите в админ-панель.')
    const headers = new Headers(init.headers)
    headers.set('Authorization', `Bearer ${key}`)
    if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')
    const response = await fetch(`${base}${API_ROOT}${path}`, { ...init, headers })
    const result = await response.json().catch(() => ({})) as { error?: string } & T
    if (!response.ok) throw new Error(result.error || `Ошибка сервера (${response.status}).`)
    return result
  }

  return {
    login,
    overview: () => request<AdminOverview>('/overview'),
    messages: () => request<{ messages: AdminMessage[] }>('/messages'),
    licenseMessages: (licenseId: string) => request<{ messages: AdminMessage[] }>(`/licenses/${encodeURIComponent(licenseId)}/messages`),
    replyToMessage: (id: string, message: string) => request(`/messages/${encodeURIComponent(id)}/reply`, { method: 'POST', body: JSON.stringify({ message }) }),
    deleteMessage: (id: string) => request(`/messages/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    decideRequest: (id: string, approve: boolean, clientName = '', years = 5, productId: ProductId = 'tsekh') =>
      request(`/requests/${encodeURIComponent(id)}/${approve ? 'approve' : 'reject'}`, {
        method: 'POST', body: JSON.stringify(approve ? { clientName, years, productId } : {}),
      }),
    rename: (id: string, clientName: string) => request(`/licenses/${encodeURIComponent(id)}/name`, { method: 'PATCH', body: JSON.stringify({ clientName }) }),
    setExpiry: (id: string, expiresAt: number) => request(`/licenses/${encodeURIComponent(id)}/term`, { method: 'PATCH', body: JSON.stringify({ expiresAt }) }),
    resetPin: (id: string) => request<{ temporaryPin: string; expiresAt: number }>(`/licenses/${encodeURIComponent(id)}/reset-pin`, { method: 'POST', body: '{}' }),
    setLicenseStatus: (id: string, active: boolean) => request(`/licenses/${encodeURIComponent(id)}/${active ? 'activate' : 'revoke'}`, { method: 'POST', body: '{}' }),
    publishRelease: (form: FormData) => request('/releases', { method: 'POST', body: form }),
    toggleRelease: (productId: ProductId, version: string) => request(`/releases/${encodeURIComponent(productId)}/${encodeURIComponent(version)}/toggle`, { method: 'POST', body: '{}' }),
  }
}
