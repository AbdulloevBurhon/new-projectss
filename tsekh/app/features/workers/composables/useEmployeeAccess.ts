import { nextTick } from 'vue'
import { clearClientPin } from '@obshaya/contracts/client-api'
import { permits, workerSections, type Right } from '../../../../endpoints/workers/permissions'
import { employeeSession, endEmployeeSession, startEmployeeSession } from '../../../../endpoints/workers/service'
import type { Employee } from '../../../../endpoints/workers/types'

export function useEmployeeAccess() {
  const token = useCookie<string | null>('tsekh_employee_session', {
    default: () => null, sameSite: 'strict', path: '/', encode: value => value ?? '', decode: value => value || null,
  })
  const activeToken = useState<string | null>('tsekh-employee-token', () => null)
  const sessionToken = computed(() => activeToken.value ?? token.value)
  const profile = useState<Employee | null>('tsekh-employee-profile', () => null)
  const isOwner = computed(() => !sessionToken.value && !profile.value)
  const can = (right: Right) => isOwner.value || (!!profile.value && permits(profile.value.permissions, right))
  function canVisit(path: string) {
    const route = path.replace(/\/+$/, '') || '/'
    return isOwner.value || (!!profile.value && (route === '/' || (route === '/revision' && can('warehouses'))
      || workerSections.some(section => route === `/${section.id}` && can(section.id))))
  }

  async function load() {
    const current = sessionToken.value
    if (!current) return
    const before = profile.value
    const result = await employeeSession()
    if (sessionToken.value !== current || profile.value !== before) return
    if (!result) throw createError({ statusCode: 401 })
    profile.value = result
  }

  async function login(pin: string, id?: string) {
    const result = await startEmployeeSession(pin, id)
    token.value = result.token
    activeToken.value = result.token
    profile.value = result.profile
    clearClientPin()
    await nextTick()
  }

  async function leave() {
    try { if (sessionToken.value) await endEmployeeSession() }
    finally {
      token.value = null
      activeToken.value = null
      profile.value = null
      await nextTick()
    }
  }

  return { token: sessionToken, profile, isOwner, can, canVisit, load, login, leave }
}
