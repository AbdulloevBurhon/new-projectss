<script setup lang="ts">
import { PinAccess, toast } from '@obshaya/ui'
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { clientApi, installationId, isTemporaryPin, type ActivationStatus } from '@obshaya/contracts/client-api'
import { useEmployeeAccess } from '../../workers/composables/useEmployeeAccess'
import { usePinAccess } from '../composables/usePinAccess'
import { employeeError } from '../../../../endpoints/workers/service'
import { syncOwnerPin } from '../../../../endpoints/workers/owner-pin'

const { access, error, verifyOwnerPin, lock } = usePinAccess()
const { leave, login, token } = useEmployeeAccess()
const busy = ref(false)
const apiBase = useRuntimeConfig().public.licenseApiBase as string
const license = useCookie<string | null>('tsekh_license_active')
const licenseUntil = useCookie<string | null>('tsekh_license_until')
const licenseNotice = useCookie<string | null>('tsekh_license_notice')
let statusTimer: ReturnType<typeof setInterval> | undefined

async function refreshDisabledStatus() {
  if (licenseNotice.value !== 'disabled' || !navigator.onLine) return
  try {
    const status = await clientApi<ActivationStatus>(apiBase, `/api/client/activation/${installationId('tsekh')}`, {signal:AbortSignal.timeout(4500)})
    if (status.licenseStatus === 'active' && status.productId === 'tsekh' && status.licenseUntil) {
      license.value = '1'; licenseUntil.value = status.licenseUntil; licenseNotice.value = null
      await navigateTo('/pin')
    } else if (status.licenseStatus !== 'disabled') {
      license.value = null; licenseUntil.value = null; licenseNotice.value = null
      await navigateTo('/activation')
    }
  } catch { /* Keep the disabled notice while the API is unavailable. */ }
}

onMounted(() => {
  lock()
  if (licenseNotice.value === 'disabled') {
    void refreshDisabledStatus()
    statusTimer = setInterval(() => void refreshDisabledStatus(), 10000)
  }
})
onBeforeUnmount(() => clearInterval(statusTimer))

function clearError() { error.value = '' }

async function submit(pin: string) {
  if (busy.value) return
  busy.value = true
  try {
    const result = await verifyOwnerPin(pin)
    if (result === 'failed') return
    if (result === 'owner' || result === 'owner-offline') {
      await leave().catch(() => {})
      if (!isTemporaryPin()) await syncOwnerPin(pin, result === 'owner' ? 'sync' : 'initialize')
    } else {
      if (license.value !== '1' || !(Date.parse(licenseUntil.value ?? '') > Date.now()) || licenseNotice.value === 'disabled') {
        error.value = 'Для входа сотрудника нужна активная лицензия.'
        return
      }
      access.value = null
      await nextTick()
      if (token.value) await leave().catch(() => {})
      await login(pin)
      access.value = '1'
    }
    await nextTick()
    toast.success('PIN-код принят')
    await navigateTo(isTemporaryPin() ? '/settings' : '/')
  } catch (cause) {
    lock()
    error.value = employeeError(cause, 'Не удалось войти. Проверьте PIN-код.')
  } finally { busy.value = false }
}

async function support(message: string) {
  try {
    await clientApi(apiBase, '/api/client/support', { method: 'POST', body: JSON.stringify({ installationId: installationId('tsekh'), product: 'tsekh', body: message }) })
    toast.success('Сообщение отправлено администратору.')
  } catch (cause) { toast.error(cause instanceof Error ? cause.message : 'Не удалось отправить сообщение.') }
}
</script>

<template>
  <PinAccess brand-name="Цех" logo-text="Ц" :error="error" :submitting="busy"
    :notice="licenseNotice === 'disabled' ? 'Услуга не оплачена. Обратитесь в службу поддержки.' : ''"
    @submit="submit" @support="support" @clear-error="clearError" />
</template>
