<script setup lang="ts">
import InventoryIcon from '~/features/tsekh/components/WorkshopIcon.vue'
import { useInventory } from '../stores/useInventory'

const { inventory } = useInventory()
const metrics = computed(() => [
  { label: 'Склады', icon: 'warehouses', value: inventory.value.warehouses.length, to: '/tsekh/warehouse' },
  { label: 'Товары в каталоге', icon: 'products', value: inventory.value.products.length, to: '/tsekh/warehouse/products' },
  { label: 'Поступления', icon: 'receipts', value: inventory.value.receipts.length, to: '/tsekh/warehouse/history' },
])
</script>

<template>
  <div class="inventory-metrics">
    <NuxtLink v-for="metric in metrics" :key="metric.icon" :to="metric.to" class="inventory-metric">
      <span class="metric-icon" :data-color="metric.icon"><InventoryIcon :name="metric.icon" /></span>
      <span><small>{{ metric.label }}</small><strong>{{ metric.value }}</strong></span>
      <InventoryIcon name="chevron" class="metric-arrow" />
    </NuxtLink>
  </div>
</template>
