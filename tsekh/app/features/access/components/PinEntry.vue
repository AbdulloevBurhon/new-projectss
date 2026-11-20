<script setup lang="ts">
import { PinAccess, toast } from '@obshaya/ui'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { clientApi, installationId, type ActivationStatus } from '@obshaya/contracts/client-api'
import { usePinAccess } from '../composables/usePinAccess'

const { error, verify } = usePinAccess()
const busy = ref(false)
const apiBase = useRuntimeConfig().public.licenseApiBase as string
const license = useCookie<string | null>('tsekh_license_active')
const licenseUntil = useCookie<string | null>('tsekh_license_until')
const licenseNotice = useCookie<string | null>('tsekh_license_notice')
let statusTimer: ReturnType<typeof setInterval> | undefined

async function refreshDisabledStatus() {
  if (licenseNotice.value !== 'disabled' || !navigator.onLine) return
  try {
    const status = await clientApi<ActivationStatus>(apiBase, `/api/client/activation/${installationId('tsekh')}`)
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
    if (!await verify(pin)) { toast.error(error.value); return }
    toast.success('PIN-код принят')
    await navigateTo('/')
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
  <PinAccess brand-name="Цех" logo-text="Ц" :error="error" :submitting="busy" :notice="licenseNotice === 'disabled' ? 'Услуга не оплачена. Обратитесь в службу поддержки.' : ''" @submit="submit" @support="support" @clear-error="clearError" />
</template>
