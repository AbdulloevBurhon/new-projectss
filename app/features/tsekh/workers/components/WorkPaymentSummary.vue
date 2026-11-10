<script setup lang="ts">
import { money } from '~/features/tsekh/warehouse/utils/format'

defineProps<{ total?: number; balance?: number; balanceAfter?: number }>()
const amount = (cents?: number) => cents === undefined ? '—' : money(cents / 100)
</script>

<template>
  <dl class="work-entry-totals" aria-live="polite">
    <div><dt>Итог оплаты</dt><dd>{{ amount(total) }}</dd></div>
    <div><dt>Остаток на счёте</dt><dd>{{ amount(balance) }}</dd></div>
    <div v-if="balanceAfter !== undefined"><dt>После оплаты</dt><dd>{{ amount(balanceAfter) }}</dd></div>
  </dl>
</template>
