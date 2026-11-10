<script setup lang="ts">
import WorkshopHeader from '~/features/tsekh/components/WorkshopHeader.vue'
import { useInventory } from '../stores/useInventory'
import { storageKey } from '../services/inventory-storage'

const { ready, storageError, load } = useInventory()
const route = useRoute()
const sections = [
  { to: '/tsekh/warehouse', icon: 'warehouses', title: 'Склады', description: 'Управляйте местами хранения и переходите к учёту остатков.' },
  { to: '/tsekh/warehouse/balance', icon: 'balance', title: 'Остатки', description: 'Проверяйте, сколько товара доступно на каждом складе.' },
  { to: '/tsekh/warehouse/history', icon: 'history', title: 'История', description: 'Просматривайте проведённые поступления и их позиции.' },
  { to: '/tsekh/warehouse/products', icon: 'products', title: 'Товары', description: 'Ведите каталог материалов и готовой продукции.' },
  { to: '/tsekh/warehouse/techcards', icon: 'techcards', title: 'Техкарты', description: 'Храните фото, цены и состав материалов для каждого изделия.' },
  { to: '/tsekh/warehouse/receipts', icon: 'receipts', title: 'Поступление', description: 'Укажите склад, количество и цену каждой позиции.' },
]
const section = computed(() => sections.find(item => item.to === route.path.replace(/\/$/, '')) ?? sections[0]!)
useHead({ title: computed(() => `${section.value.title} · Цех-4`) })

function sync(event: StorageEvent) {
  if (event.key === null || event.key === storageKey) load()
}

onMounted(() => {
  load()
  window.addEventListener('storage', sync)
})
onBeforeUnmount(() => window.removeEventListener('storage', sync))
</script>

<template>
  <WorkshopHeader section="Складской учёт" :title="section.title" :description="section.description" :icon="section.icon">
    <div class="inventory-tab-toolbar">
      <nav class="inventory-tabs" aria-label="Вкладки склада">
        <NuxtLink v-for="item in sections" :key="item.to" :to="item.to" exact-active-class="is-current">
          {{ item.title }}
        </NuxtLink>
      </nav>
      <div id="warehouse-tab-action" class="inventory-tab-action" />
    </div>

    <p v-if="storageError" class="inventory-message error" role="alert">{{ storageError }}</p>
    <slot v-else-if="ready" />
    <p v-else class="inventory-muted" role="status">Загрузка складских данных…</p>
  </WorkshopHeader>
</template>
