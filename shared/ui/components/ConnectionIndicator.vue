<script setup lang="ts">
import { useOnlineStatus } from '../composables/useOnlineStatus'

const { isOnline } = useOnlineStatus()
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
    :class="isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'"
    role="status"
    :aria-label="isOnline ? 'Интернет есть' : 'Нет интернета'"
  >
    <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
    </svg>
    {{ isOnline ? 'Интернет есть' : 'Нет интернета' }}
  </span>
</template>
