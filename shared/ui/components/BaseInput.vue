<script setup lang="ts">
import { useId } from 'vue'

const model = defineModel<string>()
withDefaults(defineProps<{ label?: string; type?: string; placeholder?: string; disabled?: boolean }>(), {
  type: 'text',
  placeholder: '',
  disabled: false,
})
const id = useId()
</script>

<template>
  <div>
    <label v-if="label" :for="id" class="mb-1.5 block text-sm font-medium text-slate-700">{{ label }}</label>
    <input :id="id" v-model="model" :type="type" :placeholder="placeholder" :disabled="disabled" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100" />
  </div>
</template>
