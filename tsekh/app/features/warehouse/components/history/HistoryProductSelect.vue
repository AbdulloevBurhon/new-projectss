<script setup lang="ts">
import { Check, ChevronDown } from '@lucide/vue'
import { Button, Input } from '@obshaya/ui'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { historySearchText } from '../../composables/useHistoryFilters'
import type { HistoryProductOption } from '../../types/history'

const props = defineProps<{ options: HistoryProductOption[] }>()
const selected = defineModel<string>({ required: true })
const triggerId = useId()
const panelId = useId()
const root = ref<HTMLElement>()
const list = ref<HTMLElement>()
const open = ref(false)
const search = ref('')
const pageSize = 30
const visibleCount = ref(pageSize)
const selectedName = computed(() => props.options.find(item => item.key === selected.value)?.name)
const query = computed(() => historySearchText(search.value))
const matching = computed(() => query.value ? props.options.filter(item => item.searchText.includes(query.value)) : props.options)
const visible = computed(() => matching.value.slice(0, visibleCount.value))

watch(query, () => {
  visibleCount.value = pageSize
  if (list.value) list.value.scrollTop = 0
})

function loadMore() {
  const area = list.value
  if (area && visibleCount.value < matching.value.length
    && area.scrollHeight - area.scrollTop - area.clientHeight <= 48) visibleCount.value += pageSize
}

async function toggle() {
  open.value = !open.value
  if (!open.value) return
  search.value = ''
  visibleCount.value = pageSize
  await nextTick()
  root.value?.querySelector<HTMLInputElement>('input')?.focus()
}

function close(restoreFocus = false) {
  open.value = false
  if (restoreFocus) root.value?.querySelector('button')?.focus()
}

function select(key: string) {
  selected.value = key
  close(true)
}

async function focusOption(event: KeyboardEvent, direction: 1 | -1) {
  const buttons = () => Array.from(list.value?.querySelectorAll('button') ?? [])
  const current = buttons().indexOf(event.target as HTMLButtonElement)
  const next = current + direction
  if (direction === -1 && next < 0) {
    root.value?.querySelector<HTMLInputElement>('input')?.focus()
    return
  }
  if (next === buttons().length && visibleCount.value < matching.value.length) {
    visibleCount.value += pageSize
    await nextTick()
  }
  buttons()[next]?.focus()
}

function closeOutside(event: Event) {
  if (open.value && event.target instanceof Node && !root.value?.contains(event.target)) close()
}
function closeOnBlur(event: FocusEvent) {
  if (open.value && event.relatedTarget && !root.value?.contains(event.relatedTarget as Node)) close()
}
function closeOnEscape(event: KeyboardEvent) {
  if (!open.value) return
  event.preventDefault()
  event.stopPropagation()
  close(true)
}
onMounted(() => document.addEventListener('pointerdown', closeOutside))
onBeforeUnmount(() => document.removeEventListener('pointerdown', closeOutside))
</script>

<template>
  <div ref="root" class="relative grid w-56 min-w-0 max-w-full gap-1 text-sm" @focusout="closeOnBlur"
    @keydown.esc="closeOnEscape">
    <label :for="triggerId">Товар</label>
    <Button :id="triggerId" type="button" variant="outline" class="h-10 w-full justify-between font-normal"
      :aria-label="`Товар: ${selectedName ?? 'Все товары'}`" :aria-expanded="open" :aria-controls="open ? panelId : undefined" @click="toggle">
      <span class="min-w-0 truncate">{{ selectedName ?? 'Все товары' }}</span>
      <ChevronDown class="size-4 opacity-60" aria-hidden="true" />
    </Button>
    <div v-if="open" :id="panelId" class="absolute inset-x-0 top-full z-40 mt-1 rounded-lg border bg-popover p-1.5 text-popover-foreground shadow-lg"
      @keydown.down.prevent="focusOption($event, 1)" @keydown.up.prevent="focusOption($event, -1)">
      <Input v-model="search" type="search" aria-label="Поиск товара в истории" placeholder="Поиск товара" class="mb-1" />
      <div ref="list" class="max-h-[min(16rem,40dvh)] overflow-y-auto overscroll-contain" @scroll.passive="loadMore">
        <button v-if="!query" type="button" :aria-pressed="!selected" class="flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-left hover:bg-accent focus-visible:bg-accent"
          @click="select('')">
          <span class="flex-1">Все товары</span><Check v-if="!selected" class="size-4 shrink-0" aria-hidden="true" />
        </button>
        <button v-for="item in visible" :key="item.key" type="button" :aria-pressed="selected === item.key" :title="item.name"
          class="flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-left hover:bg-accent focus-visible:bg-accent" @click="select(item.key)">
          <span class="min-w-0 flex-1 break-words">{{ item.name }}</span><Check v-if="selected === item.key" class="size-4 shrink-0" aria-hidden="true" />
        </button>
        <p v-if="!matching.length" role="status" class="px-2 py-2 text-muted-foreground">
          {{ query ? 'Товары не найдены' : 'В истории пока нет товаров' }}
        </p>
      </div>
    </div>
  </div>
</template>
