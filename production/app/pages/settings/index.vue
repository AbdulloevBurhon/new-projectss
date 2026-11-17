<script setup lang="ts">
import { BackupScheduleCard, SettingsWorkspace, StorageLocationsCard, scheduledArchiveKey, useArchiveFolders } from '@obshaya/ui'
import { clientApi, downloadClientFile, saveClientPin } from '@obshaya/contracts/client-api'
import { findClientUpdate, type ClientUpdate } from '@obshaya/contracts/client-updates'
import { createProductArchive, restoreProductArchive, uploadProductArchive } from '@obshaya/contracts/client-archive'
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'

const { licenseApiBase: apiBase, appVersion } = useRuntimeConfig().public
const online = ref(false)
const updateAvailable = ref<ClientUpdate | null>(null)
const downloadingUpdate = ref(false)
const cloudCopyEnabled = ref(false)
const uploadingArchive = ref(false)
const { localFolder, secondaryFolder, chooseFolder } = useArchiveFolders('production')
const { schedule, last, saveSchedule, downloadLast } = inject(scheduledArchiveKey)!
const lastBackup = computed(() => last.value && new Date(last.value.createdAt).toLocaleString('ru-RU'))
const cloudCopyKey = 'obshaya:settings:production:cloud-copy'
const updateOnline = () => { online.value = navigator.onLine }

async function changePin(pin: string) {
  try {
    await clientApi(apiBase, '/api/client/pin/change', { method: 'POST', body: JSON.stringify({ pin }) }, 'production')
    saveClientPin(pin); toast.success('PIN-код изменён.')
  } catch (error) { toast.error(error instanceof Error ? error.message : 'Не удалось изменить PIN-код.') }
}

async function checkUpdates() {
  try {
    updateAvailable.value = await findClientUpdate(apiBase, appVersion, 'production') ?? null
    toast.info(updateAvailable.value ? `Доступна версия ${updateAvailable.value.version}.` : 'Установлена последняя версия.')
  } catch (error) { toast.error(error instanceof Error ? error.message : 'Не удалось проверить обновления.') }
}

async function downloadUpdate(id: string) {
  if (updateAvailable.value?.id !== id || downloadingUpdate.value) return
  downloadingUpdate.value = true
  try { await downloadClientFile(apiBase, `/api/client/updates/${id}/download`, 'production'); toast.success('Файл обновления скачан. Установите его после закрытия программы.') }
  catch (error) { toast.error(error instanceof Error ? error.message : 'Не удалось скачать обновление.') }
  finally { downloadingUpdate.value = false }
}

async function exportData() {
  const archive = createProductArchive('production')
  const url = URL.createObjectURL(archive.blob)
  const link = document.createElement('a'); link.href = url; link.download = archive.fileName; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  if (!cloudCopyEnabled.value) return toast.success('Локальная копия скачана.')
  if (!online.value) return toast.error('Локальная копия скачана, но для облака нужен интернет.')
  uploadingArchive.value = true
  try {
    await uploadProductArchive(apiBase, new File([archive.blob], archive.fileName, { type: 'application/json' }), 'production')
    toast.success('Копия загружена в облако. Она доступна в админке → Архивация.')
  } catch (error) { toast.error(error instanceof Error ? `Копия скачана, но не загружена в облако: ${error.message}` : 'Копия скачана, но не загружена в облако.') }
  finally { uploadingArchive.value = false }
}

async function importData(file: File) {
  try { await restoreProductArchive(file, 'production'); toast.success('Данные восстановлены. Перезагрузите страницу, чтобы обновить разделы.') }
  catch (error) { toast.error(error instanceof Error ? error.message : 'Не удалось импортировать архив.') }
}

function setCloudCopy(enabled: boolean) {
  cloudCopyEnabled.value = enabled
  localStorage.setItem(cloudCopyKey, String(enabled))
  toast.success(enabled ? 'Облачная копия включена для следующего экспорта.' : 'Экспорт будет сохраняться только на устройстве.')
}

onMounted(() => { updateOnline(); cloudCopyEnabled.value = localStorage.getItem(cloudCopyKey) === 'true'; addEventListener('online', updateOnline); addEventListener('offline', updateOnline) })
onBeforeUnmount(() => { removeEventListener('online', updateOnline); removeEventListener('offline', updateOnline) })
</script>

<template>
  <SettingsWorkspace product-name="Простое производство" :current-version="appVersion" :installing-update="downloadingUpdate" :online="online" :update-available="updateAvailable" :cloud-copy-enabled="cloudCopyEnabled" :uploading-archive="uploadingArchive" @change-pin="changePin" @check-updates="checkUpdates" @download-update="downloadUpdate" @export-data="exportData" @import-data="importData" @toggle-cloud-copy="setCloudCopy">
    <StorageLocationsCard
      :local-path="localFolder?.name"
      :secondary-path="secondaryFolder?.name"
      @choose-local="chooseFolder('local')"
      @choose-secondary="chooseFolder('secondary')"
    />
    <BackupScheduleCard
      product-name="Простое производство"
      :schedule="schedule"
      :last-backup="lastBackup"
      @save="saveSchedule"
      @download-last="downloadLast"
    />
  </SettingsWorkspace>
</template>
