<script setup lang="ts">
import { ClientMessages, SidebarLayout, Toaster, scheduledArchiveKey, toast, useScheduledArchive } from '@obshaya/ui'
import { clientApi, getClientPin, installationId, isTemporaryPin, temporaryPinExpired, type ActivationStatus } from '@obshaya/contracts/client-api'
import { onBeforeUnmount, onMounted, provide } from 'vue'
import { forgetOfflinePin } from './features/access/composables/offlinePin'
import { useScheduledTelegram } from './features/settings/composables/useTelegramSchedule'
import { useWorkspaceEmployeeSession } from './features/workers/composables/useWorkspaceEmployeeSession'
import { usePinAccess } from './features/access/composables/usePinAccess'
import { useTemporaryPinState } from './features/access/composables/useTemporaryPinState'
import { reportInstalledUpdate } from '../endpoints/settings/updates/updates.service'
import { createWorkshopArchive } from '../endpoints/settings/archive/archive.service'

const route = useRoute()
const router = useRouter()
const { lock } = usePinAccess()
const temporarySession = useTemporaryPinState()
const { profile, isOwner, canVisit, access, logout } = useWorkspaceEmployeeSession(lock)
const license = useCookie<string | null>('tsekh_license_active')
const licenseUntil = useCookie<string | null>('tsekh_license_until')
const licenseNotice = useCookie<string | null>('tsekh_license_notice')
const cloudArchiveAllowed = useState('tsekh-cloud-archive-allowed', () => true)
const { licenseApiBase: apiBase, appVersion } = useRuntimeConfig().public
provide(scheduledArchiveKey, useScheduledArchive('tsekh', apiBase, () => (
  isOwner.value && license.value === '1' && access.value === '1' && route.path !== '/pin'
  && !route.path.startsWith('/activation') && !temporaryPinExpired() && !!getClientPin()
), createWorkshopArchive,()=>cloudArchiveAllowed.value))
useScheduledTelegram(apiBase, () => cloudArchiveAllowed.value && license.value === '1'
  && access.value === '1' && route.path !== '/pin' && !route.path.startsWith('/activation')
  && (isOwner.value ? !!getClientPin() && !isTemporaryPin() && !temporaryPinExpired() : !!profile.value),
  () => isOwner.value)
let licenseTimer: ReturnType<typeof setInterval> | undefined
const items = [
  { label: 'Главная', to: '/', icon: 'home' as const },
  { label: 'Склады', to: '/warehouses', icon: 'warehouse' as const },
  { label: 'Ревизия', to: '/revision', icon: 'revision' as const },
  { label: 'Счёт', to: '/accounts', icon: 'account' as const },
  { label: 'Сотрудники', to: '/workers', icon: 'workers' as const },
  { label: 'Клиенты', to: '/clients', icon: 'clients' as const },
  { label: 'Продажа', to: '/sales', icon: 'sales' as const },
  { label: 'Отчёты', to: '/reports', icon: 'reports' as const },
  { label: 'Итоги', to: '/summary', icon: 'summary' as const },
  { label: 'Настройки', to: '/settings', icon: 'settings' as const },
]

const canOpen = (path: string) => canVisit(path) && (!temporarySession.value || path === '/settings')
const visibleItems = computed(() => items.filter(item => canOpen(item.to)))
const pageAllowed = computed(() => access.value === '1' && canOpen(route.path))
const workspaceScope = computed(() => JSON.stringify([profile.value?.id, profile.value?.resources]))

function navigate(to: string) {
  void router.push(to)
}

function handlePinRejected() {
  forgetOfflinePin()
  toast.error('PIN-код больше не действует. Войдите снова.')
  logout()
}

async function refreshLicense() {
  if (license.value==='1' && !(Date.parse(licenseUntil.value??'')>Date.now())) {
    forgetOfflinePin();license.value=null;licenseUntil.value=null;lock();await router.push('/activation');return
  }
  if (temporaryPinExpired()) { lock(); await router.push('/pin'); return }
  if (!license.value || !navigator.onLine) return
  try {
    const status = await clientApi<ActivationStatus>(apiBase, `/api/client/activation/${installationId('tsekh')}`, { signal: AbortSignal.timeout(5000) })
    cloudArchiveAllowed.value = status.cloudArchiveAllowed == null ? true : Boolean(status.cloudArchiveAllowed)
    if (status.licenseStatus !== 'active' || status.productId !== 'tsekh') {
      forgetOfflinePin()
      const disabled = status.licenseStatus === 'disabled' && status.productId === 'tsekh'
      license.value = null; licenseUntil.value = null; licenseNotice.value = disabled ? 'disabled' : null
      lock(); await router.push(disabled ? '/pin?notice=disabled' : '/activation')
    } else {
      licenseNotice.value = null
      if (status.licenseUntil) licenseUntil.value = status.licenseUntil
    }
  } catch { /* Offline use remains available until the cached license expires. */ }
  if (isOwner.value && license.value === '1' && access.value === '1' && getClientPin()) {
    await reportInstalledUpdate(apiBase, appVersion).catch(() => {})
  }
}

onMounted(() => {
  temporarySession.value = isTemporaryPin()
  void refreshLicense()
  licenseTimer = setInterval(() => void refreshLicense(), 10000)
})
onBeforeUnmount(() => clearInterval(licenseTimer))
</script>

<template>
  <NuxtPage v-if="route.path === '/pin' || route.path.startsWith('/activation')" />
  <SidebarLayout v-else
    brand="Цех"
    logo-text="Ц"
    :items="visibleItems"
    :active-path="route.path"
    :compact-on-mobile="route.path === '/summary' || route.path === '/revision'"
    :workspace-title="profile?.name ?? (isOwner ? 'Админ' : 'Сотрудник')"
    @navigate="navigate"
    @logout="logout"
  >
    <NuxtPage v-slot="{ Component }">
      <component :is="Component" v-if="pageAllowed" :key="workspaceScope" />
      <div v-else class="space-y-3 p-6">
        <p>{{ route.path === '/' ? 'Выберите раздел в меню.' : 'У вас нет доступа к этому разделу.' }}</p>
        <button v-if="visibleItems[0]" type="button" class="text-primary underline" @click="navigate(visibleItems[0].to)">Открыть {{ visibleItems[0].label }}</button>
      </div>
    </NuxtPage>
  </SidebarLayout>
  <Toaster position="bottom-right" />
  <ClientMessages v-if="isOwner && !temporarySession && license === '1' && access === '1' && route.path !== '/pin' && !route.path.startsWith('/activation')" product="tsekh" :api-base="apiBase" :on-pin-rejected="handlePinRejected" />
</template>
