<script setup lang="ts">
defineProps<{ open: boolean; title: string }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4" @click.self="emit('close')">
      <section role="dialog" aria-modal="true" :aria-label="title" class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <header class="mb-4 flex items-center justify-between gap-4">
          <h2 class="text-lg font-semibold text-slate-900">{{ title }}</h2>
          <button type="button" class="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100" aria-label="Закрыть" @click="emit('close')">×</button>
        </header>
        <slot />
        <footer v-if="$slots.footer" class="mt-6 flex justify-end gap-2"><slot name="footer" /></footer>
      </section>
    </div>
  </Teleport>
</template>
