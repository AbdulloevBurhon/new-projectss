import { ref } from 'vue'
import { clearClientPin, clientApi, installationId, saveClientPin } from '@obshaya/contracts/client-api'

const ACCESS_COOKIE = 'tsekh_pin_access'
export function usePinAccess() {
  const apiBase = useRuntimeConfig().public.licenseApiBase as string
  const access = useCookie<string | null>(ACCESS_COOKIE, { sameSite: 'lax' })
  const license = useCookie<string | null>('tsekh_license_active', { sameSite: 'lax' })
  const expires = useCookie<string | null>('tsekh_license_until', { sameSite: 'lax' })
  const pin = ref('')
  const error = ref('')

  async function verify(value: string) {
    try {
      const { product, temporary, temporaryExpiresAt } = await clientApi<{ ok: boolean; product: string; temporary: boolean; temporaryExpiresAt: string | null }>(
        apiBase,
        '/api/client/pin/verify',
        { method: 'POST', body: JSON.stringify({ installationId: installationId('tsekh'), pin: value }) },
      )
      if (product !== 'tsekh') throw new Error('Эта лицензия предназначена для другого приложения.')
      saveClientPin(value, temporary, temporaryExpiresAt); access.value = '1'; error.value = ''
      return true
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Не удалось проверить PIN-код.'
      if (/лицензия не активна/i.test(error.value)) {
        license.value = null; expires.value = null; access.value = null
        clearClientPin()
        await navigateTo('/activation')
      }
      return false
    }
  }

  function lock() {
    access.value = null
    if (import.meta.client) clearClientPin()
    pin.value = ''
    error.value = ''
  }

  return { pin, error, verify, lock }
}
