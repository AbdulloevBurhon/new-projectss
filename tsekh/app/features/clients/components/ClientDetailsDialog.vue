<script setup lang="ts">
import { ref, watch } from 'vue'
import { ChevronDown, ChevronUp } from '@lucide/vue'
import { Button, DataTable, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@obshaya/ui'
import { getClientDetails } from '../../../../endpoints/sales/client-history'
import { money, type Client } from '../../../../endpoints/sales/service'

const props = defineProps<{ client: Client }>()
const emit = defineEmits<{ close: [] }>()
const details = ref<Awaited<ReturnType<typeof getClientDetails>>>()
const error = ref('')
const retry = ref(0)
const expanded = ref('')
const date = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' })
const quantity = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 9 })
const columns = [
  { key: 'date', label: 'Дата' },
  { key: 'items', label: 'Товар' },
  { key: 'paid', label: 'Оплачено', align: 'right' as const },
  { key: 'debt', label: 'Долг', align: 'right' as const },
  { key: 'employee', label: 'Сотрудник' },
  { key: 'actions', label: 'Действия', align: 'right' as const },
]

watch([() => props.client.id, retry], async ([id], _, onCleanup) => {
  const request = new AbortController()
  onCleanup(() => request.abort())
  error.value = ''
  details.value = undefined
  expanded.value = ''
  try {
    const result = await getClientDetails(id, request.signal)
    if (!request.signal.aborted) details.value = result
  } catch {
    if (!request.signal.aborted) error.value = 'Не удалось загрузить историю клиента.'
  }
}, { immediate: true })
</script>

<template>
  <Dialog :open="true" @update:open="open => { if (!open) emit('close') }">
    <DialogContent class="max-h-[90dvh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-4xl">
      <DialogHeader>
        <DialogTitle>{{ client.name }}</DialogTitle>
        <DialogDescription>{{ client.phone }}</DialogDescription>
      </DialogHeader>
      <p v-if="error" role="alert" class="text-sm text-destructive">
        {{ error }} <Button type="button" variant="outline" size="sm" @click="retry++">Повторить</Button>
      </p>
      <p v-else-if="!details" role="status" class="text-sm text-muted-foreground">Загрузка истории клиента…</p>
      <template v-else>
        <dl class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-lg border p-3">
            <dt class="text-sm text-muted-foreground">Текущий долг</dt>
            <dd class="mt-1 text-lg font-semibold tabular-nums" :class="{ 'text-destructive': details.totals.debt > 0 }">
              {{ money(details.totals.debt) }}
            </dd>
          </div>
          <div class="rounded-lg border p-3">
            <dt class="text-sm text-muted-foreground">Сумма покупок</dt>
            <dd class="mt-1 text-lg font-semibold tabular-nums">{{ money(details.totals.purchases) }}</dd>
          </div>
        </dl>
        <DataTable :columns="columns" :rows="details.rows" empty-text="У клиента пока нет покупок и платежей">
          <template #cell-date="{ row }">{{ date.format(new Date(row.date)) }}</template>
          <template #cell-items="{ row }">
            <template v-if="row.kind === 'payment'">
              Погашение долга
              <small class="block text-muted-foreground">{{ row.account }}</small>
            </template>
            <ul v-else-if="row.items.length" class="space-y-1 whitespace-normal">
              <li v-for="(item, index) in (expanded === row.id ? row.items : row.items.slice(0, 1))" :key="index">
                {{ item.name }} · {{ quantity.format(item.qty) }} {{ item.unit }}
              </li>
              <li v-if="expanded !== row.id && row.items.length > 1" class="text-xs text-muted-foreground">
                Ещё позиций {{ row.items.length - 1 }}
              </li>
            </ul>
            <span v-else>—</span>
          </template>
          <template #cell-paid="{ row }">{{ money(row.paid) }}</template>
          <template #cell-debt="{ row }">
            <span v-if="row.kind === 'payment'" class="font-medium text-green-700" aria-label="Погашение долга">
              +{{ money(-row.debt) }}
            </span>
            <span v-else-if="row.remainingDebt > 0" class="font-medium text-destructive" aria-label="Остаток долга по покупке">
              −{{ money(row.remainingDebt) }}
            </span>
            <span v-else class="text-green-700">{{ row.debt > 0 ? 'Погашено' : 'Оплачено' }}</span>
          </template>
          <template #cell-actions="{ row }">
            <Button v-if="row.items.length > 1" type="button" variant="ghost" size="icon"
              :aria-expanded="expanded === row.id" :aria-label="expanded === row.id ? 'Свернуть товары' : 'Показать все товары'"
              @click="expanded = expanded === row.id ? '' : row.id">
              <ChevronUp v-if="expanded === row.id" class="size-4" />
              <ChevronDown v-else class="size-4" />
            </Button>
            <span v-else>—</span>
          </template>
        </DataTable>
      </template>
    </DialogContent>
  </Dialog>
</template>
