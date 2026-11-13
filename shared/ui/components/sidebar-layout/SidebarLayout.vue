<script setup lang="ts">
import { ChevronLeft, ChevronRight, House, LogOut, SlidersHorizontal } from '@lucide/vue'
import { ref } from 'vue'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog'

type SidebarItem = { label: string; to: string; icon: 'home' | 'settings' }

const props = defineProps<{
  brand: string
  tagline?: string
  logoText: string
  sectionLabel?: string
  items: SidebarItem[]
  activePath: string
  workspaceTitle: string
}>()
const emit = defineEmits<{ navigate: [to: string]; logout: [] }>()
const collapsed = ref(false)
const logoutDialogOpen = ref(false)

function isActive(to: string) {
  return props.activePath === to || (to !== '/' && props.activePath.startsWith(`${to}/`))
}
</script>

<template>
  <div class="sidebar-layout" :class="{ 'sidebar-layout--collapsed': collapsed }">
    <aside class="sidebar-layout__sidebar">
      <div class="sidebar-layout__brand">
        <div class="sidebar-layout__logo" aria-hidden="true">{{ logoText }}</div>
        <div class="sidebar-layout__brand-copy">
          <strong>{{ brand }}</strong>
          <span v-if="tagline">{{ tagline }}</span>
        </div>
      </div>

      <p v-if="sectionLabel" class="sidebar-layout__section-label">{{ sectionLabel }}</p>
      <nav class="sidebar-layout__nav" :aria-label="sectionLabel || brand">
        <button
          v-for="item in items"
          :key="item.to"
          type="button"
          class="sidebar-layout__nav-item"
          :class="{ 'sidebar-layout__nav-item--active': isActive(item.to) }"
          :aria-current="isActive(item.to) ? 'page' : undefined"
          :title="collapsed ? item.label : undefined"
          @click="emit('navigate', item.to)"
        >
          <component :is="item.icon === 'home' ? House : SlidersHorizontal" :size="18" :stroke-width="1.8" />
          <span>{{ item.label }}</span>
        </button>
      </nav>

      <div class="sidebar-layout__footer">
        <div class="sidebar-layout__workspace-copy">
          <strong>{{ workspaceTitle }}</strong>
        </div>
        <button class="sidebar-layout__logout" type="button" aria-label="Выйти" title="Выйти" @click="logoutDialogOpen = true">
          <LogOut :size="18" :stroke-width="1.8" />
        </button>
        <button
          class="sidebar-layout__toggle"
          type="button"
          :aria-label="collapsed ? 'Развернуть меню' : 'Свернуть меню'"
          :title="collapsed ? 'Развернуть меню' : 'Свернуть меню'"
          @click="collapsed = !collapsed"
        >
          <ChevronRight v-if="collapsed" :size="17" />
          <ChevronLeft v-else :size="17" />
        </button>
      </div>
    </aside>

    <main class="sidebar-layout__content"><slot /></main>

    <AlertDialog v-model:open="logoutDialogOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Вы уверены, что хотите выйти?</AlertDialogTitle>
          <AlertDialogDescription>Для повторного входа потребуется PIN-код.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction @click="emit('logout')">Выйти</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

<style scoped>
.sidebar-layout { min-height: 100vh; display: flex; color: #14213a; background: #f3f6f8; font-family: inherit; }
.sidebar-layout__sidebar { position: sticky; top: 0; display: flex; flex: 0 0 234px; flex-direction: column; width: 234px; height: 100vh; padding: 12px 16px 14px; color: #e8eefb; background: #111d32; transition: width .2s ease, flex-basis .2s ease; }
.sidebar-layout__brand { display: flex; align-items: center; gap: 12px; min-height: 40px; padding: 0 4px 12px; border-bottom: 1px solid #64748b; }
.sidebar-layout__logo { display: grid; flex: 0 0 38px; width: 38px; height: 38px; place-items: center; border-radius: 12px; color: #14213a; background: #b8f04c; font-size: 15px; font-weight: 800; }
.sidebar-layout__brand-copy, .sidebar-layout__workspace-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 3px; }
.sidebar-layout__brand-copy strong { color: #fff; font-size: 18px; line-height: 1.1; }
.sidebar-layout__brand-copy span { color: #aebbd2; font-size: 9px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
.sidebar-layout__section-label { margin: 36px 8px 12px; color: #9cadc8; font-size: 10px; font-weight: 700; letter-spacing: .12em; }
.sidebar-layout__nav { display: grid; gap: 6px; margin-top: 14px; }
.sidebar-layout__nav-item { display: flex; align-items: center; gap: 13px; min-height: 44px; padding: 0 12px; border: 0; border-radius: 9px; color: #d7e1f2; background: transparent; cursor: pointer; font: inherit; font-size: 14px; font-weight: 600; text-align: left; }
.sidebar-layout__nav-item:hover { background: #1b2b41; }
.sidebar-layout__nav-item--active { box-shadow: inset 3px 0 #b8f04c; color: #fff; background: #293e43; }
.sidebar-layout__nav-item--active svg { color: #b8f04c; }
.sidebar-layout__footer { display: flex; align-items: center; gap: 10px; margin-top: auto; min-height: 48px; padding: 8px 4px 0; border-top: 1px solid #64748b; }
.sidebar-layout__workspace-copy { flex: 1; }
.sidebar-layout__workspace-copy strong { overflow: hidden; color: #fff; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }

.sidebar-layout__logout { display: grid; flex: 0 0 34px; width: 34px; height: 34px; place-items: center; border: 1px solid #40516a; border-radius: 8px; color: #d7e1f2; background: transparent; cursor: pointer; }
.sidebar-layout__logout:hover { color: #fff; background: #24354d; }
.sidebar-layout__toggle { position: absolute; right: -14px; bottom: 30px; display: grid; flex: 0 0 30px; width: 30px; height: 30px; place-items: center; border: 0; border-radius: 50%; color: #fff; background: #2879e8; box-shadow: 0 2px 7px #0003; cursor: pointer; }
.sidebar-layout__content { min-width: 0; flex: 1; }
.sidebar-layout--collapsed .sidebar-layout__sidebar { flex-basis: 76px; width: 76px; padding-right: 12px; padding-left: 12px; }
.sidebar-layout--collapsed .sidebar-layout__brand { justify-content: center; padding: 0; }
.sidebar-layout--collapsed .sidebar-layout__brand-copy, .sidebar-layout--collapsed .sidebar-layout__section-label, .sidebar-layout--collapsed .sidebar-layout__nav-item span { display: none; }
.sidebar-layout--collapsed .sidebar-layout__nav { margin-top: 14px; }
.sidebar-layout--collapsed .sidebar-layout__nav-item { justify-content: center; padding: 0; }
.sidebar-layout--collapsed .sidebar-layout__footer { justify-content: center; gap: 4px; padding-right: 0; padding-left: 0; }
.sidebar-layout--collapsed .sidebar-layout__workspace-copy { display: none; }
.sidebar-layout--collapsed .sidebar-layout__logout { flex-basis: 34px; width: 34px; }
@media (max-width: 640px) { .sidebar-layout__sidebar { flex-basis: 190px; width: 190px; } .sidebar-layout--collapsed .sidebar-layout__sidebar { flex-basis: 68px; width: 68px; padding-right: 10px; padding-left: 10px; } }
</style>













