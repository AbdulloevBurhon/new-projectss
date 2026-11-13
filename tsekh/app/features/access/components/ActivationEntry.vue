<script setup lang="ts">
import { ActivationFlow } from '@obshaya/ui'
import { clientApi, installationId, type ActivationStatus } from '@obshaya/contracts/client-api'
import { toast } from '@obshaya/ui'
import { onBeforeUnmount, onMounted, ref } from 'vue'

const product = 'tsekh' as const
const apiBase = useRuntimeConfig().public.licenseApiBase as string
const license = useCookie<string | null>('tsekh_license_active', { sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 * 5 })
const licenseUntil = useCookie<string | null>('tsekh_license_until', { sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 * 10 })
const phase = ref<'ready' | 'waiting' | 'approved' | 'rejected'>('ready')
const initialPin = ref('')
const submitting = ref(false)
let timer: ReturnType<typeof setInterval> | undefined
let lastError = ''

function reportError(cause: unknown, fallback: string) {
  const message = cause instanceof Error ? cause.message : fallback
  if (message !== lastError) toast.error(message)
  lastError = message
}

async function refreshStatus() {
  try {
    const status = await clientApi<ActivationStatus>(apiBase, `/api/client/activation/${installationId(product)}`)
    lastError = ''
    if (status.productId !== product) throw new Error('Заявка относится к другому направлению.')
    initialPin.value = status.initialPin ?? ''
    if (status.requestStatus === 'pending') phase.value = 'waiting'
    if (status.requestStatus === 'rejected') { phase.value = 'rejected'; clearInterval(timer); return }
    if (status.licenseStatus === 'active' && status.licenseUntil) {
      license.value = '1'; licenseUntil.value = status.licenseUntil; phase.value = 'approved'
      if (initialPin.value) clearInterval(timer)
      return
    }
    if (status.licenseStatus === 'disabled' || status.licenseStatus === 'expired' || status.licenseStatus === 'removed') {
      license.value = null; licenseUntil.value = null; phase.value = 'rejected'; clearInterval(timer)
    }
  } catch (cause) {
    if (!(cause instanceof Error && cause.message.includes('(404)'))) reportError(cause, 'Не удалось проверить лицензию.')
  }
}

async function requestAccess() {
  if (submitting.value) return
  submitting.value = true
  try {
    await clientApi(apiBase, '/api/client/activation', { method: 'POST', body: JSON.stringify({ installationId: installationId(product), product, version: '0.1.0' }) })
    phase.value = 'waiting'
    clearInterval(timer)
    timer = setInterval(() => void refreshStatus(), 5000)
  } catch (cause) { reportError(cause, 'Не удалось отправить заявку.') }
  finally { submitting.value = false }
}

async function continueToPin() {
  try {
    await clientApi(apiBase, `/api/client/activation/${installationId(product)}`, { method: 'POST' })
    initialPin.value = ''
    await navigateTo('/pin')
  } catch (cause) { reportError(cause, 'Не удалось продолжить вход.') }
}

onMounted(async () => { await refreshStatus(); if (phase.value === 'waiting' || (phase.value === 'approved' && !initialPin.value)) timer = setInterval(() => void refreshStatus(), 5000) })
onBeforeUnmount(() => clearInterval(timer))
</script>

<template><ActivationFlow brand-name="Цех" logo-text="Ц" :phase="phase" :submitting="submitting" :initial-pin="initialPin" @request="requestAccess" @continue="continueToPin" /></template>
