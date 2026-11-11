<script setup lang="ts">
defineProps<{ title?: string }>()
</script>

<template>
  <div class="shared-error-message" role="alert">
    <strong v-if="title">{{ title }}</strong>
    <slot />
  </div>
</template>

<style scoped>
.shared-error-message { display: grid; gap: 4px; border: 1px solid #f3c4c8; border-radius: 9px; padding: 11px 13px; color: #a92332; background: #fff3f4; font-size: 13px; }
</style>
