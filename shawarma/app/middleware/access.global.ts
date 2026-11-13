import { clearClientPin, clientApi, installationId, isTemporaryPin, temporaryPinExpired, type ActivationStatus } from '@obshaya/contracts/client-api'

export default defineNuxtRouteMiddleware(async (to) => {
  const license = useCookie<string | null>('shawarma_license_active')
  const expires = useCookie<string | null>('shawarma_license_until')
  const access = useCookie<string | null>('shawarma_pin_access')
  if (license.value === '1' && expires.value && Date.parse(expires.value) <= Date.now()) {
    license.value = null; expires.value = null; access.value = null
  }
  if (import.meta.client && license.value === '1' && navigator.onLine) {
    try {
      const status = await clientApi<ActivationStatus>(useRuntimeConfig().public.licenseApiBase as string, `/api/client/activation/${installationId('shawarma')}`)
      if (status.licenseStatus !== 'active' || status.productId !== 'shawarma') { license.value = null; expires.value = null; access.value = null }
      else if (status.licenseUntil) expires.value = status.licenseUntil
    } catch { /* Keep cached access when temporarily offline. */ }
  }
  if (to.path.startsWith('/activation')) return license.value === '1' ? navigateTo('/pin') : undefined
  if (license.value !== '1') return navigateTo('/activation')
  if (to.path === '/pin') return
  if (access.value !== '1') return navigateTo('/pin')
  if (import.meta.client && temporaryPinExpired()) { access.value = null; clearClientPin(); return navigateTo('/pin') }
  if (import.meta.client && isTemporaryPin() && to.path !== '/settings') return navigateTo('/settings')
})
