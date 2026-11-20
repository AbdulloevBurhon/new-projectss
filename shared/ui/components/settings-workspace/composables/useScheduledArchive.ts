import { createProductArchive, uploadProductArchive } from '@obshaya/contracts/client-archive'
import type { ProductId } from '@obshaya/contracts'
import type { BackupSchedule } from '../types'
import { onBeforeUnmount, onMounted, ref, watch, type InjectionKey } from 'vue'
import { toast } from 'vue-sonner'
import { dueBackupSlot, nextBackupSlot, readSchedule, scheduleKey, type SavedSchedule } from '../services/backup-schedule'
import { readBackupValue, writeBackupValues } from '../services/backup-storage'
import { writeArchiveToFolders } from './useArchiveFolders'

interface Backup {
  slot: number
  createdAt: string
  blob: Blob
  fileName: string
  cloudUploaded: boolean
}

export const scheduledArchiveKey: InjectionKey<ReturnType<typeof useScheduledArchive>> = Symbol('scheduledArchive')

export function useScheduledArchive(product: ProductId, apiBase: string, canRun: () => boolean,
  createArchive: () => ReturnType<typeof createProductArchive> | Promise<ReturnType<typeof createProductArchive>> = () => createProductArchive(product)) {
  const schedule = ref<SavedSchedule>()
  const last = ref<Backup>()
  let timer: ReturnType<typeof setTimeout> | undefined
  let running = false
  let disposed = false
  let reportedCloudFailure = false

  async function sendCloud(backup: Backup) {
    const file = new File([backup.blob], backup.fileName, { type: 'application/json' })
    try {
      await uploadProductArchive(apiBase, file, product, true, AbortSignal.timeout(20_000))
      await writeBackupValues(product, { latest: { ...backup, cloudUploaded: true } })
      reportedCloudFailure = false
    } catch (error) {
      if (!reportedCloudFailure) {
        const denied = error instanceof Error && error.message.includes('Администратор запретил')
        toast.error(denied ? error.message : 'Копия сохранена в браузере. Повторим отправку в облако.')
      }
      reportedCloudFailure = true
    }
  }

  async function run() {
    if (disposed || !canRun() || running) return
    clearTimeout(timer)
    running = true
    const startedAt = Date.now()
    const backup = async () => {
      if (disposed || !canRun()) return
      const current = readSchedule(product)
      const slot = current ? dueBackupSlot(new Date(), current) : undefined
      let previous = await readBackupValue<Backup>(product, 'latest')
      last.value = previous
      let local: Promise<void> | undefined
      if (slot !== undefined && (!previous || previous.slot < slot)) {
        const createdAt = new Date().toISOString()
        const { blob } = await createArchive()
        const fileName = `${product}-backup.json`
        previous = { slot, createdAt, blob, fileName, cloudUploaded: false }
        await writeBackupValues(product, { latest: previous })
        last.value = previous
        local = writeArchiveToFolders(product, blob, fileName).then((results) => {
          for (const result of results) {
            if (result.status === 'rejected') toast.error(String(result.reason?.message ?? result.reason))
          }
        })
      }
      const cloud = previous && current && current.intervalMinutes > 0 && current.cloudCopy
        && previous.slot >= current.startsAt && !previous.cloudUploaded && navigator.onLine
        ? sendCloud(previous) : undefined
      const [localResult] = await Promise.allSettled([local, cloud])
      if (localResult.status === 'rejected') toast.error('Не удалось записать копии в выбранные папки.')
    }
    try {
      if (navigator.locks) await navigator.locks.request(`obshaya-${product}-backup`, backup)
      else await backup()
    } catch {
      toast.error('Не удалось сохранить резервную копию.')
    } finally {
      running = false
      const current = schedule.value
      const next = current && nextBackupSlot(startedAt, current)
      if (!disposed && canRun() && next !== undefined) timer = setTimeout(run, Math.max(0, next - Date.now()))
    }
  }

  function saveSchedule(value: BackupSchedule) {
    const next = { ...value, startsAt: Date.now() }
    try {
      localStorage.setItem(scheduleKey(product), JSON.stringify(next))
    } catch {
      toast.error('Не удалось сохранить расписание в браузере.')
      return
    }
    schedule.value = next
    toast.success(value.intervalMinutes > 0 ? 'Расписание сохранено.' : 'Расписание отключено.')
    void run()
  }

  function downloadLast() {
    if (!last.value) return
    const url = URL.createObjectURL(last.value.blob)
    const link = document.createElement('a')
    link.href = url
    link.download = last.value.fileName
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function syncSchedule(event: StorageEvent) {
    if (event.key !== null && event.key !== scheduleKey(product)) return
    clearTimeout(timer)
    schedule.value = readSchedule(product)
    void run()
  }

  onMounted(() => {
    schedule.value = readSchedule(product)
    watch(canRun, (allowed) => {
      if (allowed) void run()
      else clearTimeout(timer)
    }, { immediate: true })
    window.addEventListener('online', run)
    window.addEventListener('focus', run)
    window.addEventListener('storage', syncSchedule)
  })
  onBeforeUnmount(() => {
    disposed = true
    clearInterval(timer)
    window.removeEventListener('online', run)
    window.removeEventListener('focus', run)
    window.removeEventListener('storage', syncSchedule)
  })

  return { schedule, last, saveSchedule, downloadLast }
}
