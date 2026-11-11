<script setup lang="ts">
import WorkshopIcon from './WorkshopIcon.vue'
import Modal from '~/shared/modal/Modal.vue'

defineProps<{ collapsed: boolean }>()
defineEmits<{ toggle: [] }>()
const logoutOpen = ref(false)

function confirmLogout() {
  logoutOpen.value = false
  window.dispatchEvent(new Event('tsekh:lock-session'))
}

const sections = [
  { to: '/tsekh/warehouse', label: 'Склад', icon: 'warehouses' },
  { to: '/tsekh/workers', label: 'Рабочие', icon: 'workers' },
  { to: '/tsekh/accounts', label: 'Счета', icon: 'accounts' },
  { to: '/tsekh/sales', label: 'Продажи', icon: 'sales' },
  { to: '/tsekh/clients', label: 'Клиенты', icon: 'clients' },
  { to: '/tsekh/summary', label: 'Итоги', icon: 'balance' },
  { to: '/tsekh/settings', label: 'Настройки', icon: 'settings' },
]
</script>

<template>
  <aside class="inventory-sidebar">
    <NuxtLink class="inventory-brand" to="/tsekh" aria-label="Цех-4 — главная">
      <span class="brand-mark"><WorkshopIcon name="logo" /></span>
      <span><strong>Цех<span class="brand-number">/04</span></strong><small>УПРАВЛЕНИЕ ЦЕХОМ</small></span>
    </NuxtLink>

    <nav class="inventory-nav" aria-label="Разделы цеха">
      <span class="nav-caption">РАЗДЕЛЫ ЦЕХА</span>
      <NuxtLink to="/tsekh" exact-active-class="is-current" aria-label="Главная">
        <WorkshopIcon name="logo" /><span>Главная</span>
      </NuxtLink>
      <NuxtLink v-for="section in sections" :key="section.to" :to="section.to" exact-active-class="is-current" :aria-label="section.label">
        <WorkshopIcon :name="section.icon" /><span>{{ section.label }}</span>
      </NuxtLink>
    </nav>

    <div class="sidebar-footer">
      <span class="workspace-avatar">04</span>
      <span><strong>Цех-4</strong><small>Рабочее пространство</small></span>
      <button class="sidebar-logout" type="button" aria-label="Выйти из системы" title="Выйти из системы" @click="logoutOpen = true">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5M14 16l4-4-4-4M18 12H9M14 4h5a2 2 0 0 1 2 2v3M14 20h5a2 2 0 0 0 2-2v-3" /></svg>
      </button>
    </div>
    <button class="sidebar-toggle" type="button" :aria-label="collapsed ? 'Развернуть меню' : 'Свернуть меню'" :title="collapsed ? 'Развернуть меню' : 'Свернуть меню'" @click="$emit('toggle')">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="collapsed ? 'M9 6l6 6-6 6' : 'M15 6l-6 6 6 6'" /></svg>
    </button>
    <Modal v-model="logoutOpen" title="Выйти из системы?" description="Для повторного входа потребуется PIN-код." dialog-class="inventory-dialog" body-class="logout-dialog-body">
      <p>Выйти из «Цеха-4» и перейти на страницу PIN-кода?</p>
      <template #footer="{ close }">
        <button class="inventory-button" type="button" @click="close">Нет</button>
        <button class="inventory-button primary" type="button" @click="confirmLogout">Да, выйти</button>
      </template>
    </Modal>
  </aside>
</template>
