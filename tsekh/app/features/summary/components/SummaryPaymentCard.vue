<script setup lang="ts">
import { Card } from '@obshaya/ui'
import { computed } from 'vue'
import { money } from '../../../../endpoints/sales/service'

const props = defineProps<{ total: number; paid: number }>()
const percentage = new Intl.NumberFormat('ru-RU', { style: 'percent', maximumFractionDigits: 1 })
const parts = computed(() => [
  { name: 'Оплачено', value: props.paid, color: 'bg-emerald-700', text: 'text-white' },
  { name: 'Продано в долг', value: props.total - props.paid, color: 'bg-amber-400', text: 'text-amber-950' },
].map(part => ({ ...part, share: props.total ? part.value / props.total : 0 })))
</script>

<template>
  <Card class="gap-0 rounded-2xl p-5 sm:p-6" aria-labelledby="payment-summary-title">
    <h2 id="payment-summary-title" class="text-xl font-semibold tracking-tight sm:text-2xl xl:text-[1.7rem]">Структура оплаты</h2>
    <div class="mt-7 flex h-12 overflow-hidden rounded-lg bg-muted xl:mt-9 xl:h-14" aria-hidden="true">
      <div v-for="part in parts" v-show="part.share > 0" :key="part.name" :style="{ width: part.share * 100 + '%' }"
        class="flex min-w-0 items-center justify-center overflow-hidden font-semibold tabular-nums" :class="[part.color, part.text]">
        <span v-if="part.share >= 0.17" class="whitespace-nowrap" :class="{ 'hidden sm:inline': part.share < 0.25 }">{{ percentage.format(part.share) }}</span>
      </div>
    </div>
    <dl class="mt-5 divide-y">
      <div v-for="part in parts" :key="part.name" class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-4">
        <dt class="flex items-center gap-2.5 text-sm font-medium sm:text-base">
          <span class="size-3 shrink-0 rounded-full" :class="part.color" aria-hidden="true" />{{ part.name }}
        </dt>
        <dd class="text-right font-semibold tabular-nums">
          {{ money(part.value) }} <small class="ml-1 font-normal text-muted-foreground">{{ percentage.format(part.share) }}</small>
        </dd>
      </div>
    </dl>
  </Card>
</template>
