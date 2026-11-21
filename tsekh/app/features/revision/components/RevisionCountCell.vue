<script setup lang="ts">
import { Button, Input } from '@obshaya/ui'
import { X } from '@lucide/vue'
import { computed, nextTick, ref } from 'vue'
import type { RevisionRow } from '../../../../endpoints/revision/service'
import { countUnit, displayQuantity, quantity } from '../quantity'

const props = defineProps<{ row: RevisionRow; disabled: boolean; save: (row: RevisionRow, value: number | null) => Promise<boolean> }>()
const saving = ref(false)
const error = ref('')
const initial = computed(() => props.row.actual == null || props.row.stale ? '' : String(displayQuantity(props.row, props.row.actual)))

async function commit(value: string, input?: HTMLInputElement) {
  if (saving.value || props.disabled) return
  const text = value.trim().replace(',', '.')
  const actual = text ? Number(text) : null
  if (actual != null && (!/^\d+(\.\d{0,9})?$/.test(text) || !Number.isFinite(actual) || actual > 1e9
    || (['шт', 'уп'].includes(countUnit(props.row)) && !Number.isInteger(actual)))) {
    error.value = ['шт', 'уп'].includes(countUnit(props.row)) ? 'Введите целое количество от 0.' : 'Введите число от 0.'
    if (input) input.setAttribute('aria-invalid', 'true')
    return
  }
  if (actual === null && props.row.actual === null) { error.value = ''; return }
  saving.value = true
  error.value = ''
  input?.removeAttribute('aria-invalid')
  try {
    await props.save(props.row, actual)
    await nextTick()
    if (input) input.value = initial.value
  } finally { saving.value = false }
}

function changed(event: Event) {
  const input = event.target as HTMLInputElement
  void commit(input.value, input)
}
</script>

<template>
  <div class="space-y-1">
    <div class="flex items-center justify-end gap-2">
      <Input v-if="row.current != null" :model-value="initial" class="w-24 text-right tabular-nums"
        inputmode="decimal" autocomplete="off" :aria-label="`Факт · ${row.name} · ${countUnit(row)}`"
        placeholder="—" :disabled="disabled || saving" @change="changed"
        @keydown.enter.prevent="($event.target as HTMLInputElement).blur()" />
      <span class="min-w-5 text-xs text-muted-foreground">{{ countUnit(row) }}</span>
      <Button v-if="row.actual != null" variant="ghost" size="icon" class="size-8"
        :disabled="disabled || saving" :aria-label="`Очистить подсчёт · ${row.name}`" @click="commit('')">
        <X class="size-4" />
      </Button>
    </div>
    <p v-if="error" class="whitespace-normal text-xs text-destructive" role="alert">{{ error }}</p>
    <p v-else-if="row.stale" class="whitespace-normal text-xs text-amber-800">
      {{ row.current == null ? 'Позиция выбыла со склада.' : `Пересчитайте · было введено ${quantity(row, row.actual)}` }}
    </p>
  </div>
</template>
