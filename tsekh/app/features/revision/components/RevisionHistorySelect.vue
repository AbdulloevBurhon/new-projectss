<script setup lang="ts">
import { ChevronDown } from '@lucide/vue'
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@obshaya/ui'
import { computed, ref, useId } from 'vue'
import type { RevisionHeader } from '../../../../endpoints/revision/service'
import { operationDate } from '../../warehouse/format'

const props = defineProps<{ history: RevisionHeader[]; selected: string; disabled: boolean }>()
const emit = defineEmits<{ select: [id: string] }>()
const trigger = useId()
const pageSize = 4
const optionClass = 'h-9 cursor-pointer pl-6 pr-1 text-[13px]'
const visibleCount = ref(pageSize + 1)
const currentLabel = 'Текущая ревизия'
const label = (entry: RevisionHeader) =>
  `${operationDate.format(entry.closed ?? entry.created)} · ${entry.status === 'posted' ? 'Проведена' : 'Отменена'}`
const selectedLabel = computed(() => {
  const entry = props.history.find(row => row.id === props.selected)
  return entry ? label(entry) : currentLabel
})

function loadMore(event: Event) {
  const list = event.currentTarget as HTMLElement
  if (visibleCount.value < props.history.length && list.scrollHeight - list.scrollTop - list.clientHeight <= 8) {
    visibleCount.value += pageSize
  }
}
</script>

<template>
  <div class="w-64 max-w-full space-y-1.5 text-sm font-medium">
    <label :for="trigger" class="block">История ревизий</label>
    <DropdownMenu @update:open="$event && (visibleCount = pageSize + 1)">
      <DropdownMenuTrigger as-child>
        <Button :id="trigger" variant="outline" :disabled="disabled" class="h-9 w-full justify-between bg-background px-3">
          <span class="truncate">{{ selectedLabel }}</span>
          <ChevronDown class="size-4 shrink-0 opacity-60" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" class="max-h-[min(var(--reka-dropdown-menu-content-available-height),calc(9.5rem+2px))] w-(--reka-dropdown-menu-trigger-width) overscroll-contain"
        @scroll.passive="loadMore">
        <DropdownMenuRadioGroup :model-value="selected" @update:model-value="$event !== selected && emit('select', $event)">
          <DropdownMenuRadioItem value="" :class="optionClass">{{ currentLabel }}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem v-for="entry in history.slice(0, visibleCount)" :key="entry.id" :value="entry.id" :class="optionClass">
            <span class="truncate" :title="label(entry)">{{ label(entry) }}</span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
