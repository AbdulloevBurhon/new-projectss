<script setup lang="ts">
import { PinAccess, toast } from '@obshaya/ui'
import { ref } from 'vue'
import { clientApi, installationId } from '@obshaya/contracts/client-api'
import { usePinAccess } from '../composables/usePinAccess'

const { error, verify } = usePinAccess()
const busy = ref(false)
const apiBase = useRuntimeConfig().public.licenseApiBase as string

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
    await clientApi(apiBase, '/api/client/support', { method: 'POST', body: JSON.stringify({ installationId: installationId('shawarma'), product: 'shawarma', body: message }) })
    toast.success('Сообщение отправлено администратору.')
  } catch (cause) { toast.error(cause instanceof Error ? cause.message : 'Не удалось отправить сообщение.') }
}
</script>

<template>
  <PinAccess brand-name="Шаурмичная" logo-text="Ш" :error="error" @submit="submit" @support="support" @clear-error="clearError" />
</template>
