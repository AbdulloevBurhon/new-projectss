<script setup lang="ts">
import { ClientMessages, SidebarLayout, Toaster } from '@obshaya/ui'
import { clientApi, getClientPin, installationId, temporaryPinExpired, type ActivationStatus } from '@obshaya/contracts/client-api'
import { onBeforeUnmount, onMounted } from 'vue'
import { usePinAccess } from './features/access/composables/usePinAccess'

const route = useRoute()
const router = useRouter()
const { lock } = usePinAccess()
const license = useCookie<string | null>('shawarma_license_active')
const licenseUntil = useCookie<string | null>('shawarma_license_until')
const access = useCookie<string | null>('shawarma_pin_access')
const apiBase = useRuntimeConfig().public.licenseApiBase as string
let licenseTimer: ReturnType<typeof setInterval> | undefined
const items = [
  { label: 'Главная', to: '/', icon: 'home' as const },
  { label: 'Настройки', to: '/settings', icon: 'settings' as const },
]

function navigate(to: string) {
  void router.push(to)
}

function logout() {
  lock()
  void router.push('/pin')
}

async function refreshLicense() {
  if (temporaryPinExpired()) { lock(); await router.push('/pin'); return }
  if (!license.value || !navigator.onLine) return
  try {
    const status = await clientApi<ActivationStatus>(apiBase, `/api/client/activation/${installationId('shawarma')}`)
    if (status.licenseStatus !== 'active' || status.productId !== 'shawarma') {
      license.value = null; licenseUntil.value = null; lock(); await router.push('/activation')
    } else if (status.licenseUntil) licenseUntil.value = status.licenseUntil
  } catch { /* Offline use remains available until the cached license expires. */ }
}

onMounted(() => {
  if (access.value === '1' && !getClientPin()) { lock(); void router.push('/pin') }
  void refreshLicense(); licenseTimer = setInterval(() => void refreshLicense(), 10000)
})
onBeforeUnmount(() => clearInterval(licenseTimer))
</script>

<template>
  <NuxtPage v-if="route.path === '/pin' || route.path.startsWith('/activation')" />
  <SidebarLayout v-else
    brand="Шаурмичная"
    tagline="Управление программой"
    logo-text="Ш"
    section-label="Разделы"
    :items="items"
    :active-path="route.path"
    workspace-title="Админ"
    @navigate="navigate"
    @logout="logout"
  >
    <NuxtPage />
  </SidebarLayout>
  <Toaster position="bottom-right" />
  <ClientMessages v-if="license === '1' && access === '1' && route.path !== '/pin' && !route.path.startsWith('/activation')" product="shawarma" :api-base="apiBase" />
</template>
