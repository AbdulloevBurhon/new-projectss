<script setup lang="ts">
import WorkshopIcon from '~/features/tsekh/components/WorkshopIcon.vue'
import WorkshopTable from '~/features/tsekh/components/WorkshopTable.vue'
import { quantity } from '../utils/format'

defineProps<{ rows: { id: string; name: string; warehouseName: string; available: number }[]; resetKey: string }>()
</script>

<template>
  <WorkshopTable :rows="rows" :reset-key="resetKey" v-slot="{ pageRows }">
    <thead><tr><th scope="col">Готовое изделие</th><th scope="col">Склад</th><th scope="col" class="numeric-cell">Количество</th></tr></thead>
    <tbody>
      <tr v-for="item in pageRows" :key="item.id">
        <td><span class="table-item"><span class="table-icon"><WorkshopIcon name="techcards" /></span><strong>{{ item.name }}</strong></span></td>
        <td>{{ item.warehouseName }}</td>
        <td class="numeric-cell"><span class="inventory-tag positive">{{ quantity(item.available) }} шт</span></td>
      </tr>
      <tr v-if="!rows.length"><td colspan="3" class="table-empty">Готовых изделий по выбранным фильтрам нет.</td></tr>
    </tbody>
  </WorkshopTable>
</template>
