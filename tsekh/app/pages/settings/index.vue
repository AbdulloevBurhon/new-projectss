<script setup lang="ts">
import { BackupScheduleCard, SettingsWorkspace, StorageLocationsCard, scheduledArchiveKey, useArchiveFolders } from '@obshaya/ui'
import { rememberOfflinePin } from '../../features/access/composables/offlinePin'
import { clientApi, saveClientPin } from '@obshaya/contracts/client-api'
import { uploadProductArchive } from '@obshaya/contracts/client-archive'
import { createWorkshopArchive, restoreWorkshopArchive } from '../../../endpoints/settings/archive/archive.service'
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { desktopUpdates, findUpdate, installOrDownloadUpdate } from '../../../endpoints/settings/updates/updates.service'
import type { ClientUpdate } from '../../../endpoints/settings/updates/updates.types'

const { licenseApiBase: apiBase, appVersion } = useRuntimeConfig().public
const licenseUntil=useCookie<string|null>('tsekh_license_until')
const online = ref(false)
const updateAvailable = ref<ClientUpdate | null>(null)
const installingUpdate = ref(false)
const desktop = ref(false)
const cloudCopyEnabled = ref(false)
const cloudArchiveAllowed = useState('tsekh-cloud-archive-allowed', () => true)
const uploadingArchive = ref(false)
const archiving = ref(false)
const { localFolder, secondaryFolder, chooseFolder } = useArchiveFolders('tsekh')
const { schedule, last, saveSchedule, downloadLast } = inject(scheduledArchiveKey)!
const lastBackup = computed(() => last.value && new Date(last.value.createdAt).toLocaleString('ru-RU'))
const cloudCopyKey = 'obshaya:settings:tsekh:cloud-copy'
const updateOnline = () => { online.value = navigator.onLine }

async function changePin(pin: string) {
  try {
    await clientApi(apiBase, '/api/client/pin/change', { method: 'POST', body: JSON.stringify({ pin }) }, 'tsekh')
    await rememberOfflinePin(pin,licenseUntil.value).catch(()=>{});saveClientPin(pin); toast.success('PIN-код изменён.')
  } catch (error) { toast.error(error instanceof Error ? error.message : 'Не удалось изменить PIN-код.') }
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

async function exportData() {
  if (archiving.value) return
  archiving.value = true
  try { await downloadArchive(await createWorkshopArchive()) }
  catch { toast.error('Не удалось создать архив данных «Цеха».') }
  finally { archiving.value = false }
}

async function downloadArchive(archive: Awaited<ReturnType<typeof createWorkshopArchive>>) {
  const url = URL.createObjectURL(archive.blob)
  const link = document.createElement('a'); link.href = url; link.download = archive.fileName; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  if (!cloudCopyEnabled.value) return toast.success('Локальная копия скачана.')
  if (!cloudArchiveAllowed.value) return denyCloudCopy()
  if (!online.value) return toast.error('Локальная копия скачана, но для облака нужен интернет.')
  uploadingArchive.value = true
  try {
    await uploadProductArchive(apiBase, new File([archive.blob], archive.fileName, { type: 'application/json' }), 'tsekh')
    toast.success('Копия загружена в облако. Она доступна в админке → Архивация.')
  } catch (error) { toast.error(error instanceof Error ? `Копия скачана, но не загружена в облако: ${error.message}` : 'Копия скачана, но не загружена в облако.') }
  finally { uploadingArchive.value = false }
}

async function importData(file: File) {
  if (archiving.value) return
  archiving.value = true
  try {
    if (await restoreWorkshopArchive(file)) toast.success('Данные восстановлены. Перезагрузите страницу, чтобы обновить разделы.')
  } catch (error) {
    const response = (error as { data?: { data?: { message?: string }; statusMessage?: string } } | null)?.data
    toast.error(response?.data?.message || response?.statusMessage || (error instanceof Error ? error.message : 'Не удалось импортировать архив.'))
  } finally { archiving.value = false }
}

function setCloudCopy(enabled: boolean) {
  if(enabled && !cloudArchiveAllowed.value){denyCloudCopy();return}
  cloudCopyEnabled.value = enabled
  localStorage.setItem(cloudCopyKey, String(enabled))
  toast.success(enabled ? 'Облачная копия включена для следующего экспорта.' : 'Экспорт будет сохраняться только на устройстве.')
}

function denyCloudCopy() { toast.error('Администратор запретил сохранять данные в облако.') }

onMounted(() => { desktop.value = !!desktopUpdates(); updateOnline(); cloudCopyEnabled.value = localStorage.getItem(cloudCopyKey) === 'true'; addEventListener('online', updateOnline); addEventListener('offline', updateOnline) })
onBeforeUnmount(() => { removeEventListener('online', updateOnline); removeEventListener('offline', updateOnline) })
</script>

<template>
  <SettingsWorkspace product-name="Цех" :current-version="appVersion" :install-updates="desktop" :installing-update="installingUpdate" :online="online" :update-available="updateAvailable" :cloud-copy-enabled="cloudCopyEnabled" :uploading-archive="uploadingArchive" @change-pin="changePin" @check-updates="checkUpdates" @download-update="downloadUpdate" @export-data="exportData" @import-data="importData" @toggle-cloud-copy="setCloudCopy">
    <StorageLocationsCard
      :local-path="localFolder?.name"
      :secondary-path="secondaryFolder?.name"
      @choose-local="chooseFolder('local')"
      @choose-secondary="chooseFolder('secondary')"
    />
    <div v-if="last" class="grid gap-1 text-sm" aria-live="polite">
      <span>Компьютер · {{last.local || 'Запись не подтверждена'}}</span>
      <span>USB / вторая папка · {{last.secondary || 'Запись не подтверждена'}}</span>
      <span>Облако · {{last.cloudUploaded?'Сохранено':!cloudArchiveAllowed?'Запрещено администратором':schedule?.cloudCopy?'Ожидает отправки':'Отключено'}}</span>
    </div>
    <BackupScheduleCard :schedule="schedule" :last-backup="lastBackup" :cloud-archive-allowed="cloudArchiveAllowed" @save="saveSchedule" @download-last="downloadLast" @cloud-copy-denied="denyCloudCopy" />
  </SettingsWorkspace>
</template>
