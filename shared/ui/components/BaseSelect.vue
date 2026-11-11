<script setup lang="ts">
const model = defineModel<string | number>()
withDefaults(defineProps<{ label?: string; options: Array<{ label: string; value: string | number }>; disabled?: boolean }>(), { disabled: false })
const id = `select-${Math.random().toString(36).slice(2)}`
</script>

<template>
  <div>
    <label v-if="label" :for="id" class="mb-1.5 block text-sm font-medium text-slate-700">{{ label }}</label>
    <select :id="id" v-model="model" :disabled="disabled" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100">
      <option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option>
    </select>
  </div>
</template>
