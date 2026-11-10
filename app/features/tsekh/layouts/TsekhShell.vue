<script setup lang="ts">
import LicenseAccess from '~/features/license/components/LicenseAccess.vue'
import TsekhSidebar from '~/features/tsekh/components/TsekhSidebar.vue'
import WorkshopAccess from '~/features/tsekh/settings/components/WorkshopAccess.vue'

const collapsed = ref(false)
const sidebarKey = 'tsekh4-sidebar-collapsed'

onMounted(() => {
  collapsed.value = localStorage.getItem(sidebarKey) === '1'
})

function toggleSidebar() {
  collapsed.value = !collapsed.value
  localStorage.setItem(sidebarKey, collapsed.value ? '1' : '0')
}
</script>

<template>
  <LicenseAccess v-slot="{ productId }">
    <div v-if="productId === 'tsekh'" class="tsekh-access-root">
      <WorkshopAccess>
        <div class="warehouse-shell" :class="{ 'is-sidebar-collapsed': collapsed }">
          <TsekhSidebar :collapsed="collapsed" @toggle="toggleSidebar" />
          <div class="inventory-workspace"><slot /></div>
        </div>
      </WorkshopAccess>
    </div>
    <main v-else class="license-shell" role="status">Эта лицензия выдана для другого направления. <NuxtLink :to="productId === 'shawarma' ? '/shawarma' : '/activation'">Перейти к программе</NuxtLink></main>
  </LicenseAccess>
</template>

<style>
.tsekh-access-root { min-height: 100vh; }
.tsekh-access-root .warehouse-shell { min-height: 100vh; }
.license-shell a { color: #286fd2; text-decoration: underline; }
</style>
