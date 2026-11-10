<script setup lang="ts">
import LicenseAccess from '~/features/license/components/LicenseAccess.vue'
import ShawarmaSidebar from '~/features/shawarma/components/ShawarmaSidebar.vue'
import ShawarmaAccess from '~/features/shawarma/settings/components/ShawarmaAccess.vue'

const collapsed = ref(false)
const sidebarKey = 'shawarma-sidebar-collapsed-v1'

onMounted(() => { collapsed.value = localStorage.getItem(sidebarKey) === '1' })
function toggleSidebar() {
  collapsed.value = !collapsed.value
  localStorage.setItem(sidebarKey, collapsed.value ? '1' : '0')
}
</script>

<template>
  <LicenseAccess v-slot="{ productId }">
    <div v-if="productId === 'shawarma'" class="shawarma-shell-root">
      <ShawarmaAccess>
        <div class="warehouse-shell" :class="{ 'is-sidebar-collapsed': collapsed }">
          <ShawarmaSidebar :collapsed="collapsed" @toggle="toggleSidebar" />
          <div class="inventory-workspace"><slot /></div>
        </div>
      </ShawarmaAccess>
    </div>
    <main v-else class="license-shell" role="status">Эта лицензия выдана для другого направления. <NuxtLink :to="productId === 'tsekh' ? '/tsekh/settings' : '/activation'">Перейти к программе</NuxtLink></main>
  </LicenseAccess>
</template>

<style>
.shawarma-shell-root { min-height: 100vh; }
.shawarma-shell-root .warehouse-shell { min-height: 100vh; }
</style>
