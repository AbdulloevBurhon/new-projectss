<script setup lang="ts">
import WorkshopIcon from './WorkshopIcon.vue'

defineProps<{ section: string; title: string; description: string; icon: string }>()
const online = ref(false)
onMounted(() => { online.value = navigator.onLine; window.addEventListener('online', () => online.value = true); window.addEventListener('offline', () => online.value = false) })
</script>

<template>
  <header class="inventory-topbar">
    <div class="inventory-crumb">
      <span>{{ section }}</span>
      <WorkshopIcon name="chevron" />
      <strong>{{ title }}</strong>
    </div>
    <span class="local-status" :title="online ? 'Интернет подключён' : 'Работа без интернета'"><span aria-hidden="true">🌐</span> {{ online ? 'Онлайн' : 'Офлайн' }}</span>
  </header>

  <main class="inventory-main">
    <div class="inventory-heading">
      <div>
        <div class="inventory-kicker"><WorkshopIcon :name="icon" /> {{ section }}</div>
        <h1>{{ title }}</h1>
        <p>{{ description }}</p>
      </div>
      <slot name="action" />
    </div>
    <slot />
  </main>
</template>
