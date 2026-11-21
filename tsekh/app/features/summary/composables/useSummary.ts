import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { getSummary, summaryBoundaries, type SummaryDay, type SummaryPeriod } from '../../../../endpoints/summary/summary.service'

export const summaryPeriods = [
  { days: 1, label: 'Сегодня' },
  { days: 7, label: '7 дней' },
  { days: 30, label: '30 дней' },
] as const

const fullDate = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
const initial = { total: 0, paid: 0, count: 0 }

export function useSummary() {
  const selection = shallowRef({ period: 7 as SummaryPeriod, date: new Date() })
  const period = computed(() => selection.value.period)
  const days = ref<SummaryDay[]>([])
  const loading = ref(true)
  const error = ref('')
  const bounds = computed(() => summaryBoundaries(selection.value.period, selection.value.date))
  const dateRange = ref('')
  const totals = computed(() => days.value.reduce((result, day) => ({
    total: result.total + day.total, paid: result.paid + day.paid, count: result.count + day.count,
  }), initial))

  onMounted(() => {
    watch(bounds, async (boundaries, _, onCleanup) => {
      const request = new AbortController()
      onCleanup(() => request.abort())
      dateRange.value = fullDate.formatRange(boundaries[0]!, boundaries.at(-2)!)
      loading.value = true
      error.value = ''
      try {
        const result = await getSummary(boundaries, request.signal)
        if (!request.signal.aborted) days.value = result
      } catch {
        if (!request.signal.aborted) error.value = 'Не удалось загрузить итоги.'
      } finally {
        if (!request.signal.aborted) loading.value = false
      }
    }, { immediate: true })
  })

  function selectPeriod(next: SummaryPeriod) {
    selection.value = { period: next, date: new Date() }
  }
  return { period, days, loading, error, dateRange, totals, selectPeriod }
}
