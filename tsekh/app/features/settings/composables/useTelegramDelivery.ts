import { computed, ref, watch } from 'vue'
import {
  checkTelegramPhone, connectTelegramSchedule, sendTelegramReconciliation, telegramError, telegramStatus, type DeliveryStatus,
} from '../../../../endpoints/settings/telegram/telegram.service'
import { useTelegramScheduleState } from './useTelegramSchedule'

type TelegramCardOptions = { apiBase: string; allowed: boolean; online: boolean }

export function useTelegramDelivery(props: Readonly<TelegramCardOptions>) {
  const phone = ref('')
  const delivery = ref<DeliveryStatus>({ state: 'idle' })
  const busy = ref(false)
  const error = ref('')
  const { interval: deviceInterval, error: scheduleError } = useTelegramScheduleState()
  const interval = computed(() => deviceInterval.value ?? delivery.value.intervalMinutes)
  const status = computed(() => delivery.value.phone && phone.value.replace(/\D/g, '') === delivery.value.phone.replace(/\D/g, '')
    ? delivery.value.state : 'idle')
  const bound = computed(() => !!interval.value && ['sent', 'unknown'].includes(status.value))

  async function run(task: () => Promise<DeliveryStatus>, restorePhone = false, recover = false) {
    if (busy.value) return
    busy.value = true
    error.value = ''
    try {
      const result = await task()
      delivery.value = { ...result, intervalMinutes: result.intervalMinutes ?? delivery.value.intervalMinutes }
      if (restorePhone && result.phone) phone.value = result.phone
    } catch (cause) {
      error.value = telegramError(cause)
      if (recover) {
        delivery.value = await telegramStatus(props.apiBase).catch(() => ({ state: 'unknown', phone: phone.value }))
      }
    } finally { busy.value = false }
  }

  function check() {
    if (!props.allowed || !props.online || !phone.value.trim() || bound.value || status.value === 'sending') return
    void run(() => checkTelegramPhone(props.apiBase, phone.value), true)
  }

  function send() {
    if (status.value !== 'verified' || !delivery.value.ticket || !props.allowed || !props.online) return
    const ticket = delivery.value.ticket
    void run(async () => {
      const result = await sendTelegramReconciliation(props.apiBase, ticket, delivery.value.reportFormat)
      await connectTelegramSchedule(props.apiBase).catch(() => {})
      return { ...result, intervalMinutes: interval.value }
    }, false, true)
  }

  function checkConfirmation() {
    void run(() => telegramStatus(props.apiBase))
  }

  watch(() => props.allowed && props.online, available => {
    if (available) void run(() => telegramStatus(props.apiBase), !phone.value)
  }, { immediate: true })

  watch(status, (current, _, onCleanup) => {
    if (current !== 'pending' && current !== 'sending') return
    const timer = setInterval(() => { if (props.online && props.allowed) checkConfirmation() }, 3500)
    onCleanup(() => clearInterval(timer))
  })

  return { phone, interval, delivery, busy, error, status, bound, scheduleError, check, send, checkConfirmation }
}
