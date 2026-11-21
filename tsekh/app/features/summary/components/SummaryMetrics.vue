<script setup lang="ts">
import { Coins, CreditCard, ReceiptText, ShoppingCart } from '@lucide/vue'
import { Card } from '@obshaya/ui'
import { computed } from 'vue'
import { money } from '../../../../endpoints/sales/service'

const props = defineProps<{ total: number; paid: number; count: number }>()
const countFormat = new Intl.NumberFormat('ru-RU')
const metrics = computed(() => [
  { name: 'Продажи', value: money(props.total), detail: 'Общая сумма продаж', icon: ShoppingCart, tone: 'bg-blue-100 text-blue-700' },
  { name: 'Оплачено', value: money(props.paid), detail: 'Оплата при продаже', icon: CreditCard, tone: 'bg-emerald-100 text-emerald-700' },
  { name: 'Продано в долг', value: money(props.total - props.paid), detail: 'Долг при продаже', icon: Coins, tone: 'bg-amber-100 text-amber-700' },
  { name: 'Чеки', value: countFormat.format(props.count), detail: 'Средний чек ' + money(props.count ? Math.round(props.total / props.count) : 0),
    icon: ReceiptText, tone: 'bg-indigo-100 text-indigo-700' },
])
</script>

<template>
  <dl class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Показатели за период">
    <Card v-for="metric in metrics" :key="metric.name" class="min-w-0 gap-0 rounded-2xl p-5 sm:p-6 xl:py-7">
      <dt class="text-[15px] font-medium text-foreground/85 sm:text-base xl:text-lg">
        <span class="mb-3 grid size-13 place-items-center rounded-xl sm:size-14 xl:size-16" :class="metric.tone" aria-hidden="true">
          <component :is="metric.icon" class="size-6 sm:size-7" :stroke-width="1.8" />
        </span>
        {{ metric.name }}
      </dt>
      <dd class="mt-1 break-words text-[clamp(1.5rem,2.5vw,2.5rem)] leading-tight font-bold tracking-tight tabular-nums">{{ metric.value }}</dd>
      <dd class="mt-2 text-sm leading-5 text-muted-foreground xl:text-base">{{ metric.detail }}</dd>
    </Card>
  </dl>
</template>
