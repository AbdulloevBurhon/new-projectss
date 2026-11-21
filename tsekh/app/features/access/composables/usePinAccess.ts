import { forgetOfflinePin,offlineVerify,rememberOfflinePin } from './offlinePin'
import { ref } from 'vue'
import { clearClientPin, clientApi, ClientApiError, installationId, saveClientPin } from '@obshaya/contracts/client-api'

import { useTemporaryPinState } from './useTemporaryPinState'

const ACCESS_COOKIE = 'tsekh_pin_access'
export function usePinAccess() {
  const apiBase = useRuntimeConfig().public.licenseApiBase as string
  const access = useCookie<string | null>(ACCESS_COOKIE, { sameSite: 'lax' })
  const license = useCookie<string | null>('tsekh_license_active', { sameSite: 'lax' })
  const expires = useCookie<string | null>('tsekh_license_until', { sameSite: 'lax' })
  const pin = ref('')
  const error = ref('')
  const temporarySession = useTemporaryPinState()

  async function enterOffline(value:string) {
    if(license.value!=='1' || !await offlineVerify(value,expires.value)) return false
    saveClientPin(value);temporarySession.value=false;access.value='1';error.value='';return true
  }

  async function verifyOwnerPin(value: string): Promise<'owner' | 'owner-offline' | 'employee-fallback' | 'failed'> {
    try {
      if (!navigator.onLine) {
        return await enterOffline(value).catch(() => false) ? 'owner-offline' : 'employee-fallback'
      }
      const { product, temporary, temporaryExpiresAt } = await clientApi<{ ok: boolean; product: string; temporary: boolean; temporaryExpiresAt: string | null }>(
        apiBase,
        '/api/client/pin/verify',
        { method: 'POST', signal:AbortSignal.timeout(5000), body: JSON.stringify({ installationId: installationId('tsekh'), pin: value }) },
      )
      if (product !== 'tsekh') throw new Error('Эта лицензия предназначена для другого приложения.')
      if(temporary)forgetOfflinePin()
      else await rememberOfflinePin(value,expires.value).catch(()=>{})
      saveClientPin(value, temporary, temporaryExpiresAt); temporarySession.value = temporary; access.value = '1'; error.value = ''
      return 'owner'
    } catch (cause) {
      if (cause instanceof ClientApiError && cause.status === 401) return 'employee-fallback'
      if (cause instanceof TypeError || (cause instanceof DOMException && cause.name === 'TimeoutError')) {
        return await enterOffline(value).catch(() => false) ? 'owner-offline' : 'employee-fallback'
      }
      error.value = cause instanceof Error ? cause.message : 'Не удалось проверить PIN-код.'
      if (/лицензия не активна/i.test(error.value)) {
        forgetOfflinePin();license.value = null; expires.value = null; access.value = null
        clearClientPin()
        temporarySession.value = false
        await navigateTo('/activation')
      }
      return 'failed'
    }
  }

  function lock() {
    access.value = null
    if (import.meta.client) clearClientPin()
    temporarySession.value = false
    pin.value = ''
    error.value = ''
  }

  return { pin, error, verifyOwnerPin, lock, access }
}
