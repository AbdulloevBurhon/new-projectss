<script setup lang="ts">
import WorkshopTable from '~/features/tsekh/components/WorkshopTable.vue'
import InventoryIcon from '~/features/tsekh/components/WorkshopIcon.vue'
import type { Catalog, Product, TechCard, Warehouse } from '../types/inventory'
import { money, quantity } from '../utils/format'
import { warehouseKind, warehouseKinds } from '../utils/warehouse-kind'

type Entry = Warehouse | Product | TechCard
defineProps<{ catalog: Catalog; visible: Entry[]; empty: string; resetKey: string }>()
defineEmits<{ action: [mode: 'form' | 'delete' | 'info', item: Entry] }>()
</script>

<template>
  <WorkshopTable :rows="visible" :reset-key="resetKey" v-slot="{ pageRows }">
    <thead>
      <tr>
        <th scope="col">Название</th>
        <th v-if="catalog === 'warehouses'" scope="col">Тип склада</th>
        <th v-if="catalog === 'products'" scope="col">Ед. изм.</th>
        <template v-if="catalog === 'techcards'"><th scope="col">Производство</th><th scope="col">Продажа</th></template>
        <th scope="col" class="table-actions">Действия</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="item in pageRows" :key="item.id">
        <td><span class="table-item"><span class="table-icon"><InventoryIcon :name="catalog" /></span><strong>{{ item.name }}</strong></span></td>
        <td v-if="catalog === 'warehouses'">{{ warehouseKinds[warehouseKind(item)] }}</td>
        <td v-if="'unit' in item"><span class="inventory-tag">{{ item.unit }}</span><small v-if="item.quantityPerPiece" class="table-secondary">{{ quantity(item.quantityPerPiece) }} {{ item.contentUnit }} в 1 шт</small></td>
        <template v-if="'cost' in item"><td>{{ money(item.cost) }}</td><td>{{ money(item.price) }}</td></template>
        <td class="table-actions">
          <div class="inventory-actions">
            <button v-if="catalog === 'techcards'" type="button" class="icon-button" :aria-label="`Инфо: ${item.name}`" title="Инфо" @click="$emit('action', 'info', item)"><InventoryIcon name="info" /></button>
            <button type="button" class="icon-button" :aria-label="`Изменить: ${item.name}`" title="Изменить" @click="$emit('action', 'form', item)"><InventoryIcon name="edit" /></button>
            <button type="button" class="icon-button danger" :aria-label="`Удалить: ${item.name}`" title="Удалить" @click="$emit('action', 'delete', item)"><InventoryIcon name="trash" /></button>
          </div>
        </td>
      </tr>
      <tr v-if="!visible.length"><td :colspan="catalog === 'techcards' ? 4 : 3" class="table-empty">{{ empty }}</td></tr>
    </tbody>
  </WorkshopTable>
</template>
