<script setup lang="ts">
import WorkshopIcon from './ShawarmaIcon.vue'
import Modal from '~/shared/modal/Modal.vue'

defineProps<{ collapsed: boolean }>()
defineEmits<{ toggle: [] }>()
const logoutOpen = ref(false)

function confirmLogout() {
  logoutOpen.value = false
  window.dispatchEvent(new Event('shawarma:lock-session'))
}
</script>

<template>
  <aside class="inventory-sidebar shawarma-sidebar">
    <NuxtLink class="inventory-brand" to="/shawarma" aria-label="Шаурмичная — главная">
      <span class="brand-mark"><WorkshopIcon name="sales" /></span>
      <span><strong>Шаурмичная</strong><small>УПРАВЛЕНИЕ ПРОГРАММОЙ</small></span>
    </NuxtLink>
    <nav class="inventory-nav" aria-label="Разделы шаурмичной">
      <span class="nav-caption">РАЗДЕЛЫ</span>
      <NuxtLink to="/shawarma" exact-active-class="is-current"><WorkshopIcon name="logo" /><span>Главная</span></NuxtLink>
      <NuxtLink to="/shawarma/settings" exact-active-class="is-current"><WorkshopIcon name="settings" /><span>Настройки</span></NuxtLink>
    </nav>
    <div class="sidebar-footer">
      <span class="workspace-avatar">Ш</span>
      <span><strong>Шаурмичная</strong><small>Рабочее пространство</small></span>
      <button class="sidebar-logout" type="button" aria-label="Выйти из системы" title="Выйти из системы" @click="logoutOpen = true">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5M14 16l4-4-4-4M18 12H9M14 4h5a2 2 0 0 1 2 2v3M14 20h5a2 2 0 0 0 2-2v-3" /></svg>
      </button>
    </div>
    <button class="sidebar-toggle" type="button" :aria-label="collapsed ? 'Развернуть меню' : 'Свернуть меню'" :title="collapsed ? 'Развернуть меню' : 'Свернуть меню'" @click="$emit('toggle')">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="collapsed ? 'M9 6l6 6-6 6' : 'M15 6l-6 6 6 6'" /></svg>
    </button>
    <Modal v-model="logoutOpen" title="Выйти из системы?" description="Для повторного входа потребуется PIN-код." dialog-class="inventory-dialog" body-class="logout-dialog-body">
      <p>Выйти из шаурмичной и перейти на страницу PIN-кода?</p>
      <template #footer="{ close }">
        <button class="inventory-button" type="button" @click="close">Нет</button>
        <button class="inventory-button primary" type="button" @click="confirmLogout">Да, выйти</button>
      </template>
    </Modal>
  </aside>
</template>

<style>
.shawarma-sidebar .brand-mark { color: #203a18; }
.shawarma-sidebar .inventory-nav a .inventory-icon { width: 19px; height: 19px; }
</style>
