<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'primary' | 'secondary' | 'danger'; disabled?: boolean; type?: 'button' | 'submit' | 'reset' }>(), {
  variant: 'secondary',
  disabled: false,
  type: 'button',
})
</script>

<template>
  <button
    :type="type"
    class="rounded-lg border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
    :class="{
      'border-lime-400 bg-lime-300 text-slate-950 hover:bg-lime-200': variant === 'primary',
      'border-slate-300 bg-white text-slate-800 hover:bg-slate-50': variant === 'secondary',
      'border-red-200 bg-white text-red-700 hover:bg-red-50': variant === 'danger',
    }"
    :disabled="disabled"
  ><slot /></button>
</template>
