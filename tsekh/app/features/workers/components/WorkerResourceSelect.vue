<script setup lang="ts">
import { ChevronDown } from '@lucide/vue'
import { ref, useId } from 'vue'

defineProps<{ label: string; options: { id: string; name: string }[]; disabled: boolean }>()
const selected = defineModel<string[]>({ required: true })
const open = defineModel<boolean>('open', { required: true })
const dropdown = ref<HTMLElement>()
const trigger = ref<HTMLButtonElement>()
const panelId = useId()

function closeOnBlur(event: FocusEvent) {
  if (open.value && !dropdown.value?.contains(event.relatedTarget as Node | null)) open.value = false
}

function closeOnEscape(event: KeyboardEvent) {
  if (!open.value) return
  event.preventDefault()
  event.stopPropagation()
  open.value = false
  trigger.value?.focus()
}
</script>

<template>
  <div ref="dropdown" class="relative rounded-md border bg-background text-sm"
    @focusout="closeOnBlur" @keydown.esc="closeOnEscape">
    <button ref="trigger" type="button" :disabled="disabled" :aria-expanded="open" :aria-controls="panelId"
      class="flex min-h-9 w-full items-center justify-between gap-2 rounded-md px-3 py-1.5" @click="open = !open">
      <span>{{ label }} <small class="text-muted-foreground">· {{ selected.length }}</small></span>
      <ChevronDown class="size-4 text-muted-foreground" :class="{ 'rotate-180': open }" aria-hidden="true" />
    </button>
    <fieldset v-show="open" :id="panelId" :disabled="disabled" class="absolute inset-x-0 top-full z-10 mt-1 max-h-[min(10rem,30dvh)] min-w-0 overflow-y-auto rounded-md border bg-background p-2 shadow-md">
      <legend class="sr-only">{{ label }}</legend>
      <label v-for="option in options" :key="option.id" class="flex min-h-8 items-center gap-2 px-1">
        <input v-model="selected" type="checkbox" :value="option.id" class="size-4 shrink-0 accent-primary" /> {{ option.name }}
      </label>
      <p v-if="!options.length" class="px-1 py-2 text-muted-foreground">Список пуст</p>
    </fieldset>
  </div>
</template>
