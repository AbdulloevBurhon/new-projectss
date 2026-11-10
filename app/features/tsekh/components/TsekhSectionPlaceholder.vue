<script setup lang="ts">
import WorkshopHeader from './WorkshopHeader.vue'
import WorkshopIcon from './WorkshopIcon.vue'

defineProps<{ title: string; description: string; icon: string }>()
</script>

<template>
  <WorkshopHeader section="Управление цехом" :title="title" :description="description" :icon="icon">
    <section class="inventory-panel tsekh-empty-panel">
      <span class="tsekh-empty-icon"><WorkshopIcon :name="icon" /></span>
      <div>
        <h2>{{ title }}</h2>
        <p>Структура раздела подготовлена. Рабочая логика будет добавлена отдельно.</p>
      </div>
    </section>
  </WorkshopHeader>
</template>

<style scoped>
.tsekh-empty-panel { display:flex; align-items:center; gap:16px; padding:22px; }
.tsekh-empty-icon { display:grid; place-items:center; width:46px; height:46px; flex:none; border-radius:13px; color:#436b25; background:#eff8df; }
.tsekh-empty-icon :deep(.inventory-icon) { width:23px; height:23px; }
.tsekh-empty-panel h2 { margin:0 0 5px; color:var(--ink); font-size:16px; font-weight:750; }
.tsekh-empty-panel p { margin:0; color:var(--muted); font-size:13px; line-height:1.5; }
</style>
