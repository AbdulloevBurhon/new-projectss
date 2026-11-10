<script setup lang="ts">
import type { Warehouse } from '~/features/tsekh/warehouse/types/inventory'
import { warehouseKind } from '~/features/tsekh/warehouse/utils/warehouse-kind'

const props = defineProps<{ warehouses: Warehouse[]; requiredMaterials: boolean; disabled: boolean }>()
const materialId = defineModel<string>('materialId', { required: true })
const finishedId = defineModel<string>('finishedId', { required: true })
const materials = computed(() => props.warehouses.filter(item => warehouseKind(item) === 'materials'))
const finished = computed(() => props.warehouses.filter(item => warehouseKind(item) === 'finished'))

watch(materials, items => {
  if (!items.some(item => item.id === materialId.value)) materialId.value = items.length === 1 ? items[0]!.id : ''
}, { immediate: true })
watch(finished, items => {
  if (!items.some(item => item.id === finishedId.value)) finishedId.value = items.length === 1 ? items[0]!.id : ''
}, { immediate: true })
</script>

<template>
  <label class="inventory-field">Склад для списания
    <select v-model="materialId" :required="requiredMaterials" :disabled="disabled">
      <option value="">{{ materials.length ? 'Выберите склад' : 'Нет складов материалов' }}</option>
      <option v-for="warehouse in materials" :key="warehouse.id" :value="warehouse.id">{{ warehouse.name }}</option>
    </select>
  </label>
  <label class="inventory-field">Склад готовых изделий
    <select v-model="finishedId" required :disabled="disabled">
      <option value="" disabled>{{ finished.length ? 'Выберите склад' : 'Добавьте склад готовой продукции' }}</option>
      <option v-for="warehouse in finished" :key="warehouse.id" :value="warehouse.id">{{ warehouse.name }}</option>
    </select>
  </label>
</template>
