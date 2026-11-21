import { nextTick, onBeforeUnmount, onMounted } from 'vue'
import { getClientPin } from '@obshaya/contracts/client-api'
import { useEmployeeAccess } from './useEmployeeAccess'

export function useWorkspaceEmployeeSession(lock: () => void) {
  const employee = useEmployeeAccess()
  const route = useRoute()
  const router = useRouter()
  const access = useCookie<string | null>('tsekh_pin_access')
  let timer: ReturnType<typeof setInterval> | undefined

  async function logout() {
    lock()
    access.value = null
    await nextTick()
    try { await employee.leave() } catch { /* The browser session has already been cleared. */ }
    await router.push('/pin')
  }

  async function refreshEmployee() {
    const token = employee.token.value
    if (!token || access.value !== '1' || route.path === '/pin' || route.path.startsWith('/activation')) return
    try { await employee.load() }
    catch (cause) {
      if (employee.token.value === token && (cause as { statusCode?: number }).statusCode === 401) await logout()
    }
  }

  onMounted(() => {
    if (access.value === '1' && employee.isOwner.value && !getClientPin()) void logout()
    void refreshEmployee()
    timer = setInterval(() => void refreshEmployee(), 10000)
  })
  onBeforeUnmount(() => clearInterval(timer))

  return { ...employee, access, logout }
}
