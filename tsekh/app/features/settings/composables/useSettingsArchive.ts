import { onMounted, ref, type Ref } from 'vue'
import { toast } from 'vue-sonner'
import { uploadProductArchive } from '@obshaya/contracts/client-archive'
import { createWorkshopArchive, restoreWorkshopArchive } from '../../../../endpoints/settings/archive/archive.service'

export function useSettingsArchive(apiBase: string, online: Ref<boolean>, cloudArchiveAllowed: Ref<boolean>) {
  const cloudCopyEnabled = ref(false)
  const uploadingArchive = ref(false)
  const archiving = ref(false)
  const cloudCopyKey = 'obshaya:settings:tsekh:cloud-copy'
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

  onMounted(() => { cloudCopyEnabled.value = localStorage.getItem(cloudCopyKey) === 'true' })
  return { cloudCopyEnabled, uploadingArchive, exportData, importData, setCloudCopy, denyCloudCopy }
}
