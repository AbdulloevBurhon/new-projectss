import type { BackupStatus } from '../types/settings'
import { runScheduledBackup } from '../services/scheduled-backup'

export function useBackupRuntime() {
  const last = useState<BackupStatus | undefined>('workshop-backup-last', () => undefined)
  const error = useState('workshop-backup-error', () => '')
  let interval: number | undefined
  let running = false

  async function check() {
    if (running) return
    running = true
    try {
      const status = await runScheduledBackup()
      if (status) last.value = status
      error.value = ''
    } catch {
      error.value = 'Не удалось сохранить резервную копию в браузере.'
    } finally {
      running = false
    }
  }

  onMounted(() => {
    void check()
    interval = window.setInterval(check, 30_000)
    document.addEventListener('visibilitychange', check)
  })
  onBeforeUnmount(() => {
    window.clearInterval(interval)
    document.removeEventListener('visibilitychange', check)
  })
}
