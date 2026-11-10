<script setup lang="ts">
import WorkshopIcon from '~/features/tsekh/components/WorkshopIcon.vue'
import type { Client } from '../types/clients'
import { matchesClient } from '../utils/purchases'

const props = defineProps<{ clients: Client[]; disabled: boolean }>()
const emit = defineEmits<{ add: [] }>()
const clientId = defineModel<string>({ required: true })
const labelId = useId()
const selectionId = useId()
const panelId = useId()
const root = useTemplateRef<HTMLElement>('root')
const trigger = useTemplateRef<HTMLButtonElement>('trigger')
const search = useTemplateRef<HTMLInputElement>('search')
const list = useTemplateRef<HTMLElement>('list')
const opened = ref(false)
const query = ref('')
const pageSize = 15
const limit = ref(pageSize)
const selected = computed(() => props.clients.find(client => client.id === clientId.value))
const matches = computed(() => props.clients.filter(client => matchesClient(client, query.value)))
const visible = computed(() => matches.value.slice(0, limit.value))
const hasMore = computed(() => limit.value < matches.value.length)

watch(query, () => {
  limit.value = pageSize
  if (list.value) list.value.scrollTop = 0
})
watch(() => props.disabled, disabled => { if (disabled) opened.value = false })

async function toggle() {
  opened.value = !opened.value
  if (!opened.value) return
  query.value = ''
  limit.value = pageSize
  await nextTick()
  search.value?.focus()
}

function choose(id: string) {
  clientId.value = id
  opened.value = false
  trigger.value?.focus()
}

function add() {
  opened.value = false
  emit('add')
}

function showMore() {
  if (hasMore.value) limit.value += pageSize
}

function onScroll() {
  const element = list.value
  if (element && element.scrollHeight - element.scrollTop - element.clientHeight <= 32) showMore()
}

function closeOutside(event: PointerEvent) {
  if (opened.value && !root.value?.contains(event.target as Node)) opened.value = false
}

function onEscape(event: KeyboardEvent) {
  if (!opened.value) return
  event.preventDefault()
  event.stopPropagation()
  opened.value = false
  trigger.value?.focus()
}

onMounted(() => document.addEventListener('pointerdown', closeOutside))
onBeforeUnmount(() => document.removeEventListener('pointerdown', closeOutside))
</script>

<template>
  <div ref="root" class="client-picker" @keydown.esc="onEscape">
    <span :id="labelId" class="inventory-field">Клиент</span>
    <div class="client-picker-controls">
      <button ref="trigger" type="button" class="inventory-button secondary client-picker-trigger" :disabled="disabled"
        :aria-labelledby="`${labelId} ${selectionId}`" :aria-expanded="opened" :aria-controls="opened ? panelId : undefined" @click="toggle">
        <span :id="selectionId">{{ selected ? `${selected.name} · ${selected.phone}` : clientId ? 'Клиент недоступен' : 'Без клиента' }}</span>
        <WorkshopIcon name="chevron" />
      </button>
      <button type="button" class="inventory-button secondary client-picker-add" aria-label="Добавить клиента"
        title="Добавить клиента" :disabled="disabled" @click="add"><WorkshopIcon name="plus" /></button>
    </div>
    <div v-if="opened" :id="panelId" class="client-picker-panel">
      <label class="inventory-search client-picker-search">
        <WorkshopIcon name="search" />
        <input ref="search" v-model="query" type="search" aria-label="Поиск клиента" placeholder="Имя или телефон" @keydown.enter.prevent />
      </label>
      <div ref="list" class="client-picker-list" @scroll.passive="onScroll">
        <button type="button" class="client-picker-option" :aria-pressed="!clientId" @click="choose('')">Без клиента</button>
        <button v-for="client in visible" :key="client.id" type="button" class="client-picker-option"
          :aria-pressed="clientId === client.id" @click="choose(client.id)">
          <strong>{{ client.name }}</strong><small>{{ client.phone }}</small>
        </button>
        <p v-if="!matches.length" class="inventory-muted client-picker-empty">
          {{ query.trim() ? 'Совпадений не найдено.' : 'Клиентов пока нет.' }}
        </p>
        <button v-if="hasMore" type="button" class="inventory-button secondary client-picker-more" @click="showMore">Показать ещё</button>
      </div>
    </div>
  </div>
</template>

<style src="../assets/client-picker.css"></style>
