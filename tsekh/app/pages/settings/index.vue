<script setup lang="ts">
import { BackupScheduleCard, SettingsWorkspace, StorageLocationsCard, scheduledArchiveKey, useArchiveFolders } from '@obshaya/ui'
import { useSettingsArchive } from '../../features/settings/composables/useSettingsArchive'
import TelegramDeliveryCard from '../../features/settings/components/TelegramDeliveryCard.vue'
import ReceiptPrinterCard from '../../features/settings/components/ReceiptPrinterCard.vue'
import { TabsContent, TabsTrigger } from '@obshaya/ui'
import { rememberOfflinePin } from '../../features/access/composables/offlinePin'
import { useTemporaryPinState } from '../../features/access/composables/useTemporaryPinState'
import { clientApi, ClientApiError, getClientPin, isTemporaryPin, saveClientPin } from '@obshaya/contracts/client-api'
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { desktopUpdates, findUpdate, installOrDownloadUpdate } from '../../../endpoints/settings/updates/updates.service'
import type { ClientUpdate } from '../../../endpoints/settings/updates/updates.types'
import { finishOwnerPin, reserveOwnerPin, syncOwnerPin } from '../../../endpoints/workers/owner-pin'
import { employeeError } from '../../../endpoints/workers/service'

const { licenseApiBase: apiBase, appVersion } = useRuntimeConfig().public
const licenseUntil=useCookie<string|null>('tsekh_license_until')
const online = ref(false)
const temporarySession = useTemporaryPinState()
const updateAvailable = ref<ClientUpdate | null>(null)
const installingUpdate = ref(false)
const desktop = ref(false)
const cloudArchiveAllowed = useState('tsekh-cloud-archive-allowed', () => true)
const telegramAllowed = computed(() => cloudArchiveAllowed.value && !temporarySession.value)
const { cloudCopyEnabled, uploadingArchive, exportData, importData, setCloudCopy, denyCloudCopy } = useSettingsArchive(apiBase, online, cloudArchiveAllowed)
const { localFolder, secondaryFolder, chooseFolder } = useArchiveFolders('tsekh')
const { schedule, last, saveSchedule, downloadLast } = inject(scheduledArchiveKey)!
const lastBackup = computed(() => last.value && new Date(last.value.createdAt).toLocaleString('ru-RU'))
const updateOnline = () => { online.value = navigator.onLine }

async function changePin(pin: string) {
  try {
    const current = getClientPin()
    if (current && !isTemporaryPin()) await syncOwnerPin(current, 'initialize')
    const { reservation } = await reserveOwnerPin(pin)
    try {
      await clientApi(apiBase, '/api/client/pin/change', {
        method: 'POST', signal: AbortSignal.timeout(10000), body: JSON.stringify({ pin }),
      }, 'tsekh')
    } catch (cause) {
      if (cause instanceof ClientApiError && cause.status < 500) await finishOwnerPin('cancel', reservation).catch(() => {})
      throw cause
    }
    saveClientPin(pin)
    temporarySession.value = false
    await finishOwnerPin('commit', reservation).catch(() => syncOwnerPin(pin))
    await rememberOfflinePin(pin, licenseUntil.value).catch(() => {})
    toast.success('PIN-код изменён.')
  } catch (error) {
    toast.error(employeeError(error, error instanceof Error ? error.message : 'Не удалось изменить PIN-код.'))
  }
}

async function checkUpdates() {
  try {
    updateAvailable.value = await findUpdate(apiBase, appVersion) ?? null
    toast.info(updateAvailable.value ? `Доступна версия ${updateAvailable.value.version}.` : 'Установлена последняя версия.')
  } catch (error) { toast.error(error instanceof Error ? error.message : 'Не удалось проверить обновления.') }
}

async function downloadUpdate(id: string) {
  const update = updateAvailable.value
  if (update?.id !== id || installingUpdate.value) return
  installingUpdate.value = true
  try {
    await installOrDownloadUpdate(apiBase, update)
    if (!desktop.value) toast.success('Файл обновления скачан.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Не удалось получить обновление.')
  } finally {
    installingUpdate.value = false
  }
}

onMounted(() => { desktop.value = !!desktopUpdates(); updateOnline(); addEventListener('online', updateOnline); addEventListener('offline', updateOnline) })
onBeforeUnmount(() => { removeEventListener('online', updateOnline); removeEventListener('offline', updateOnline) })
</script>

<template>
  <SettingsWorkspace class="[&_section.auto-rows-fr]:auto-rows-auto" product-name="Цех" :current-version="appVersion" :install-updates="desktop" :installing-update="installingUpdate" :online="online" :update-available="updateAvailable" :cloud-copy-enabled="cloudCopyEnabled" :uploading-archive="uploadingArchive" @change-pin="changePin" @check-updates="checkUpdates" @download-update="downloadUpdate" @export-data="exportData" @import-data="importData" @toggle-cloud-copy="setCloudCopy">
    <template #tabs><TabsTrigger value="printer" class="h-9 rounded-lg px-4">Принтер</TabsTrigger></template>
    <template #panels><TabsContent value="printer"><ReceiptPrinterCard /></TabsContent></template>
    <template #notice>
      <p v-if="temporarySession" class="rounded-lg border bg-muted px-4 py-3 text-sm" role="status">
        Вы вошли по временному PIN-коду. Сохраните новый пятизначный PIN-код ниже, чтобы открыть рабочие разделы и включить Telegram.
      </p>
    </template>
    <StorageLocationsCard
      :local-path="localFolder?.name"
      :secondary-path="secondaryFolder?.name"
      @choose-local="chooseFolder('local')"
      @choose-secondary="chooseFolder('secondary')"
    />
    <BackupScheduleCard :schedule="schedule" :last-backup="lastBackup" :cloud-archive-allowed="cloudArchiveAllowed" @save="saveSchedule" @download-last="downloadLast" @cloud-copy-denied="denyCloudCopy">
      <template #status>
        <div v-if="last" class="grid gap-1 text-xs text-slate-600" aria-live="polite">
          <span>Компьютер · {{last.local || 'Запись не подтверждена'}}</span>
          <span>USB / вторая папка · {{last.secondary || 'Запись не подтверждена'}}</span>
          <span>Облако · {{last.cloudUploaded?'Сохранено':!cloudArchiveAllowed?'Запрещено администратором':schedule?.cloudCopy?'Ожидает отправки':'Отключено'}}</span>
        </div>
      </template>
    </BackupScheduleCard>
    <ClientOnly>
      <TelegramDeliveryCard :api-base="apiBase" :allowed="telegramAllowed" :online="online" :pin-required="temporarySession" />
    </ClientOnly>
  </SettingsWorkspace>
</template>
