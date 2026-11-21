import { ClientApiError } from '@obshaya/contracts/client-api'
import { connectTelegramSchedule, runDeviceTelegramSchedule, telegramError } from '../../../../endpoints/settings/telegram/telegram.service'

export function useTelegramScheduleState() {
  return {
    interval: useState<number | undefined>('tsekh-telegram-interval', () => undefined),
    error: useState('tsekh-telegram-schedule-error', () => ''),
  }
}

export function useScheduledTelegram(apiBase: string, canRun: () => boolean, isOwner: () => boolean) {
  const { interval, error } = useTelegramScheduleState()
  let timer: ReturnType<typeof setInterval> | undefined
  let running = false
  let connectAfter = 0

  async function run() {
    if (running || !canRun()) return
    running = true
    try {
      let result = await runDeviceTelegramSchedule()
      if (result.needsDevice && isOwner() && navigator.onLine && Date.now() >= connectAfter) {
        connectAfter = Date.now() + 60_000
        if (await connectTelegramSchedule(apiBase)) result = await runDeviceTelegramSchedule()
      }
      for (;;) {
        if (result.intervalMinutes !== undefined || result.needsDevice) interval.value = result.intervalMinutes
        if (!result.more || !canRun() || !navigator.onLine) break
        result = await runDeviceTelegramSchedule()
      }
      error.value = ''
    } catch (cause) {
      if (!(cause instanceof ClientApiError && cause.status === 404)) error.value = telegramError(cause)
    } finally { running = false }
  }

  onMounted(() => {
    timer = setInterval(run, 10_000)
    window.addEventListener('online', run)
    window.addEventListener('offline', run)
    void run()
  })
  onBeforeUnmount(() => {
    clearInterval(timer)
    window.removeEventListener('online', run)
    window.removeEventListener('offline', run)
  })
}
