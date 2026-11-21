<script setup lang="ts">
import { Card } from '@obshaya/ui'
import { computed, ref } from 'vue'
import { money } from '../../../../endpoints/sales/service'
import type { SummaryDay } from '../../../../endpoints/summary/summary.service'

const props = defineProps<{ days: SummaryDay[] }>()
const active = ref<string>()
const label = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })
const peak = computed(() => Math.max(0, ...props.days.map(day => day.total)))
const hasSales = computed(() => props.days.some(day => day.count > 0))
const axis = computed(() => {
  const desired = Math.max(1, peak.value / 5)
  const power = 10 ** Math.floor(Math.log10(desired))
  const step = Math.ceil(power * ([1, 2, 2.5, 5, 10].find(scale => scale * power >= desired) ?? 10))
  const segments = Math.max(1, Math.ceil(peak.value / step))
  return { top: step * segments, ticks: Array.from({ length: segments + 1 }, (_, index) => step * (segments - index)) }
})
const labelInterval = computed(() => props.days.length > 7 ? 7 : 1)
const detail = computed(() => props.days.find(day => day.start === active.value))
</script>

<template>
  <Card class="min-w-0 gap-0 rounded-2xl p-5 sm:p-6" aria-labelledby="sales-chart-title">
    <h2 id="sales-chart-title" class="text-xl font-semibold tracking-tight sm:text-2xl xl:text-[1.7rem]">Продажи по дням</h2>
    <div v-if="hasSales" class="relative mt-6 grid grid-cols-[auto_1fr] gap-x-2 sm:gap-x-3 xl:mt-9">
      <div class="relative h-52 sm:h-64" aria-hidden="true">
        <span class="invisible block px-1 text-xs">{{ money(axis.top) }}</span>
        <span v-for="tick in axis.ticks" :key="tick" class="absolute right-0 -translate-y-1/2 whitespace-nowrap text-right text-[10px] text-muted-foreground sm:text-xs"
          :style="{ top: (1 - tick / axis.top) * 100 + '%' }">{{ money(tick) }}</span>
      </div>
      <div class="relative flex h-52 min-w-0 items-end gap-1 border-l px-1 sm:h-64 sm:gap-2 sm:px-2" role="group" aria-label="Сумма продаж по дням">
        <div v-for="tick in axis.ticks" :key="tick" class="pointer-events-none absolute inset-x-0 border-t" aria-hidden="true"
          :style="{ top: (1 - tick / axis.top) * 100 + '%' }" />
        <button v-for="(day, index) in days" :key="day.start" type="button"
          class="group relative h-full min-w-0 flex-1 rounded-sm outline-none focus-visible:bg-blue-50"
          :aria-label="`${label.format(new Date(day.start))}, ${money(day.total)}`" :aria-pressed="active === day.start"
          :title="`${label.format(new Date(day.start))} · ${money(day.total)}`" @click="active = day.start">
          <span class="absolute inset-x-0 bottom-0 mx-auto block max-w-28 rounded-t-md transition-colors"
            :class="day.total ? 'bg-blue-600 group-hover:bg-blue-700 group-aria-pressed:bg-blue-800' : 'bg-blue-100'"
            :style="{ height: day.total ? day.total / axis.top * 100 + '%' : '2px' }">
            <span v-if="days.length <= 7 && day.total > 0" class="absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 whitespace-nowrap text-[11px] font-medium text-foreground lg:block">
              {{ money(day.total) }}
            </span>
          </span>
          <span v-if="index % labelInterval === 0 || index === days.length - 1 && index % labelInterval >= 3"
            :class="{ 'hidden sm:block': days.length === 7 && index % 2 === 1 }"
            class="absolute top-full left-1/2 mt-2 -translate-x-1/2 whitespace-nowrap text-[10px] text-muted-foreground sm:text-xs">{{ label.format(new Date(day.start)) }}</span>
        </button>
      </div>
    </div>
    <p v-else class="grid min-h-60 place-items-center text-center text-sm text-muted-foreground">Нет продаж за выбранный период</p>
    <p v-if="hasSales" class="mt-8 min-h-5 text-sm tabular-nums text-muted-foreground" aria-live="polite">
      <template v-if="detail">{{ label.format(new Date(detail.start)) }} · {{ money(detail.total) }}</template>
    </p>
  </Card>
</template>
