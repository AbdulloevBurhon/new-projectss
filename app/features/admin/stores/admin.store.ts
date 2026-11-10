import type { AdminOverview } from '../types/admin.types'
import { useAdminApi } from '../services/adminApi'

export function useAdminStore() {
  const overview = useState<AdminOverview | null>('admin-overview', () => null)
  const loading = useState('admin-loading', () => false)
  const error = useState<string | null>('admin-error', () => null)
  const api = useAdminApi()

  async function refresh() {
    loading.value = true
    error.value = null
    try { overview.value = await api.overview() }
    catch (cause) { error.value = cause instanceof Error ? cause.message : 'Не удалось получить данные.'; throw cause }
    finally { loading.value = false }
  }

  async function login(key: string) {
    if (!import.meta.client) return
    const token = await api.login(key)
    sessionStorage.setItem('obshaya-admin-key', token)
    try { await refresh() }
    catch (cause) { sessionStorage.removeItem('obshaya-admin-key'); throw cause }
  }

  function logout() {
    if (import.meta.client) sessionStorage.removeItem('obshaya-admin-key')
    overview.value = null
  }

  return { overview, loading, error, refresh, login, logout }
}
