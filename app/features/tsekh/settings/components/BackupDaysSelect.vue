<script setup lang="ts">
import WorkshopIcon from '~/features/tsekh/components/WorkshopIcon.vue'

const days = defineModel<number[]>({ required: true })
const dropdown = useTemplateRef<HTMLDetailsElement>('dropdown')
const trigger = useTemplateRef<HTMLElement>('trigger')
const weekdays = [
  { id: 1, name: 'Понедельник', short: 'Пн' },
  { id: 2, name: 'Вторник', short: 'Вт' },
  { id: 3, name: 'Среда', short: 'Ср' },
  { id: 4, name: 'Четверг', short: 'Чт' },
  { id: 5, name: 'Пятница', short: 'Пт' },
  { id: 6, name: 'Суббота', short: 'Сб' },
  { id: 0, name: 'Воскресенье', short: 'Вс' },
]
const selected = computed(() => weekdays.filter(day => days.value.includes(day.id)))
const caption = computed(() => selected.value.length === weekdays.length
  ? 'Каждый день' : selected.value.map(day => day.short).join(', ') || 'Выберите дни')

function close() {
  if (dropdown.value) dropdown.value.open = false
  trigger.value?.focus()
}

function onEscape(event: KeyboardEvent) {
  if (!dropdown.value?.open) return
  event.preventDefault()
  event.stopPropagation()
  close()
}

function closeOutside(event: PointerEvent) {
  const element = dropdown.value
  if (element?.open && !element.contains(event.target as Node)) element.open = false
}

onMounted(() => document.addEventListener('pointerdown', closeOutside))
onBeforeUnmount(() => document.removeEventListener('pointerdown', closeOutside))
</script>

<template>
  <div class="inventory-field settings-days-field">
    <span>Дни недели</span>
    <details ref="dropdown" class="settings-days" @keydown.esc="onEscape">
      <summary ref="trigger" class="inventory-button secondary settings-days-trigger" :aria-label="`Дни недели, ${caption}`" :title="caption">
        <span>{{ caption }}</span><WorkshopIcon name="chevron" />
      </summary>
      <fieldset class="settings-days-options">
        <legend class="sr-only">Дни резервного копирования</legend>
        <label v-for="day in weekdays" :key="day.id" class="settings-day-option">
          <input v-model="days" type="checkbox" :value="day.id" /><span>{{ day.name }}</span>
        </label>
        <button type="button" class="inventory-button secondary" @click="close">Готово</button>
      </fieldset>
    </details>
  </div>
</template>
