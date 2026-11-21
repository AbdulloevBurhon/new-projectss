<script setup lang="ts">
import { Button, Card } from '@obshaya/ui'
import { summaryPeriods, useSummary } from '../composables/useSummary'
import SummaryMetrics from './SummaryMetrics.vue'
import SummaryPaymentCard from './SummaryPaymentCard.vue'
import SummarySalesChart from './SummarySalesChart.vue'

const { period, days, loading, error, dateRange, totals, selectPeriod } = useSummary()
</script>

<template>
  <section class="mx-auto w-full max-w-[100rem] px-5 py-7 sm:px-8 sm:py-9" aria-labelledby="summary-title" :aria-busy="loading">
    <header class="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
      <div>
        <h1 id="summary-title" class="text-3xl leading-tight font-bold tracking-tight sm:text-[2.8rem]">Итоги</h1>
        <p class="mt-1 text-base text-muted-foreground sm:text-lg">Продажи и оплата за выбранный период</p>
      </div>
      <div class="inline-flex max-w-full flex-wrap rounded-xl border bg-card p-1 text-sm sm:mt-2 sm:min-w-80" role="group" aria-label="Период итогов">
        <Button v-for="item in summaryPeriods" :key="item.days" type="button"
          :variant="period === item.days ? 'default' : 'ghost'" :aria-pressed="period === item.days"
          class="h-9 rounded-lg px-2.5 sm:flex-1 sm:px-4" @click="selectPeriod(item.days)">{{ item.label }}</Button>
      </div>
    </header>
    <p class="mt-5 mb-5 min-h-6 text-base font-semibold sm:mt-6 sm:mb-6 sm:text-lg">{{ dateRange }}</p>
    <div v-if="loading" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" role="status" aria-label="Загружаем итоги">
      <Card v-for="item in 4" :key="item" class="h-44 animate-pulse rounded-2xl bg-card motion-reduce:animate-none" />
    </div>
    <Card v-else-if="error" class="items-start gap-3 rounded-2xl px-6 py-5">
      <p class="text-sm text-destructive" role="alert">{{ error }}</p>
      <Button type="button" variant="outline" @click="selectPeriod(period)">Повторить</Button>
    </Card>
    <template v-else>
      <SummaryMetrics v-bind="totals" />
      <div class="mt-6 grid gap-5 xl:mt-8 xl:grid-cols-[minmax(0,1.34fr)_minmax(0,1fr)]">
        <SummarySalesChart :key="period" :days="days" />
        <SummaryPaymentCard :total="totals.total" :paid="totals.paid" />
      </div>
    </template>
  </section>
</template>
