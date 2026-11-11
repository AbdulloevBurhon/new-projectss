<script setup lang="ts">
import { BaseTable } from '@obshaya/ui'
const columns = [{ key: 'client', label: 'Клиент' }, { key: 'product', label: 'Направление' }, { key: 'device', label: 'Устройство' }, { key: 'date', label: 'Дата' }, { key: 'status', label: 'Статус' }]
const rows = [
  { client: 'Демо-клиент 1', product: 'Цех', device: 'demo-device-01', date: 'Сегодня, 09:15', status: 'Ожидает решения' },
  { client: 'Демо-клиент 2', product: 'Шаурма', device: 'demo-device-02', date: 'Сегодня, 10:40', status: 'Ожидает решения' },
]
</script>

<template>
  <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><header class="border-b border-slate-200 px-5 py-4"><h2 class="text-lg font-semibold">Заявки</h2></header><div class="p-4 sm:p-5"><BaseTable :columns="columns" :rows="rows" row-key="device"><template #cell-device="{ value }"><span class="font-mono text-xs">{{ value }}</span></template><template #cell-status="{ value }"><span class="rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-800">{{ value }}</span></template></BaseTable></div></section>
</template>
