<script setup lang="ts">
defineProps<{ htmlFor?: string; required?: boolean }>()
</script>

<template>
  <label :for="htmlFor" class="shared-label">
    <slot />
    <span v-if="required" aria-hidden="true" class="shared-required">*</span>
  </label>
</template>

<style scoped>
.shared-label { display: inline-flex; align-items: center; gap: 4px; color: #3e4f64; font-size: 12px; font-weight: 650; }
.shared-required { color: #c43243; }
</style>
