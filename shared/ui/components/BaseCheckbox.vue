<script setup lang="ts">
const model = defineModel<boolean>({ default: false })
defineProps<{ label?: string; disabled?: boolean }>()
</script>

<template>
  <label class="inline-flex items-center gap-2 text-sm text-slate-700">
    <input v-model="model" type="checkbox" :disabled="disabled" class="size-4 rounded border-slate-300 accent-lime-500 disabled:opacity-50" />
    <span v-if="label">{{ label }}</span><slot />
  </label>
</template>
