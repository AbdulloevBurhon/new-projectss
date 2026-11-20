import { clearClientPin, isTemporaryPin, temporaryPinExpired } from '@obshaya/contracts/client-api'

export default defineNuxtRouteMiddleware(async (to) => {
  const license = useCookie<string | null>('tsekh_license_active')
  const expires = useCookie<string | null>('tsekh_license_until')
  const licenseNotice = useCookie<string | null>('tsekh_license_notice')
  const access = useCookie<string | null>('tsekh_pin_access')
  if (to.path === '/pin' && to.query.notice === 'disabled') licenseNotice.value = 'disabled'
  if (license.value === '1' && !(Date.parse(expires.value??'')>Date.now())) {
    license.value = null; expires.value = null; access.value = null
  }
  if (licenseNotice.value === 'disabled') return to.path === '/pin' ? undefined : navigateTo('/pin?notice=disabled')
  if (to.path.startsWith('/activation')) return license.value === '1' ? navigateTo('/pin') : undefined
  if (license.value !== '1') return navigateTo('/activation')
  if (to.path === '/pin') return
  if (access.value !== '1') return navigateTo('/pin')
  if (import.meta.client && temporaryPinExpired()) { access.value = null; clearClientPin(); return navigateTo('/pin') }
  if (import.meta.client && isTemporaryPin() && to.path !== '/settings') return navigateTo('/settings')
})
