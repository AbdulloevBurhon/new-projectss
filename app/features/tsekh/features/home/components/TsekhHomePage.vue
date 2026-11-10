<script setup lang="ts">
import WorkshopHeader from '~/features/tsekh/components/WorkshopHeader.vue'
import WorkshopIcon from '~/features/tsekh/components/WorkshopIcon.vue'

const sections = [
  { to: '/tsekh/warehouse', title: 'Склад', description: 'Материалы, остатки и поступления.', icon: 'warehouses' },
  { to: '/tsekh/workers', title: 'Рабочие', description: 'Сотрудники и рабочие смены.', icon: 'workers' },
  { to: '/tsekh/accounts', title: 'Счета', description: 'Счета и движение денежных средств.', icon: 'accounts' },
  { to: '/tsekh/sales', title: 'Продажи', description: 'Продажи и операции цеха.', icon: 'sales' },
  { to: '/tsekh/clients', title: 'Клиенты', description: 'Список клиентов и контакты.', icon: 'clients' },
  { to: '/tsekh/summary', title: 'Итоги', description: 'Сводные результаты работы.', icon: 'balance' },
  { to: '/tsekh/settings', title: 'Настройки', description: 'Лицензия, PIN, архив и обновления.', icon: 'settings' },
]
</script>

<template>
  <WorkshopHeader section="Управление цехом" title="Главная" description="Выберите раздел для работы с цехом." icon="logo">
    <nav class="tsekh-feature-grid" aria-label="Разделы цеха">
      <NuxtLink v-for="section in sections" :key="section.to" class="inventory-panel tsekh-feature-card" :to="section.to">
        <span class="tsekh-feature-icon"><WorkshopIcon :name="section.icon" /></span>
        <span class="tsekh-feature-copy"><strong>{{ section.title }}</strong><small>{{ section.description }}</small></span>
        <span class="tsekh-feature-arrow"><WorkshopIcon name="chevron" /></span>
      </NuxtLink>
    </nav>
  </WorkshopHeader>
</template>

<style scoped>
.tsekh-feature-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:15px; }
.tsekh-feature-card { display:flex; align-items:center; gap:14px; min-height:112px; padding:19px; color:var(--ink); text-decoration:none; transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease; }
.tsekh-feature-card:hover { transform:translateY(-2px); border-color:#c5d6b2; box-shadow:0 8px 20px #14263a12; }
.tsekh-feature-icon { display:grid; place-items:center; width:45px; height:45px; flex:none; border-radius:13px; color:#426d21; background:#eff8df; }
.tsekh-feature-icon :deep(.inventory-icon) { width:22px; height:22px; }
.tsekh-feature-copy { display:grid; gap:5px; min-width:0; }
.tsekh-feature-copy strong { font-size:15px; font-weight:750; }
.tsekh-feature-copy small { color:var(--muted); font-size:12px; line-height:1.4; }
.tsekh-feature-arrow { display:grid; place-items:center; width:30px; height:30px; flex:none; margin-left:auto; border:1px solid var(--line); border-radius:9px; color:#66778d; }
.tsekh-feature-arrow :deep(.inventory-icon) { width:16px; height:16px; }
@media (max-width:1050px) { .tsekh-feature-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media (max-width:600px) { .tsekh-feature-grid { grid-template-columns:minmax(0,1fr); } }
</style>
