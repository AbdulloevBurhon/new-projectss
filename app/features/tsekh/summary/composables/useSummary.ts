import { readSummarySources, summarySourceChanged } from '../services/summary-sources'
import type { SummarySources } from '../types/summary'
import { calculateSummary } from '../utils/calculate-summary'

export function useSummary() {
  const sources = shallowRef<SummarySources>()
  const error = ref('')
  const period = reactive({ from: '', to: '' })
  const invalidPeriod = computed(() => !!period.from && !!period.to && period.from > period.to)
  const totals = computed(() => sources.value && !invalidPeriod.value ? calculateSummary(sources.value, period) : undefined)

  function load() {
    try {
      sources.value = readSummarySources()
      error.value = ''
    } catch {
      error.value = 'Не удалось загрузить данные для итогов.'
    }
  }

  function sync(event: StorageEvent) {
    if (summarySourceChanged(event.key)) load()
  }

  function reset() {
    period.from = ''
    period.to = ''
  }

  onMounted(() => {
    load()
    window.addEventListener('storage', sync)
  })
  onBeforeUnmount(() => window.removeEventListener('storage', sync))

  return { period, invalidPeriod, totals, error, reset }
}
