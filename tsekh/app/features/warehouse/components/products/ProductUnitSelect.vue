<script setup lang="ts">
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@obshaya/ui'
import { productUnits, type ProductUnit } from '../../../../../endpoints/warehouse/products/products.types'

const model = defineModel<ProductUnit>({ required: true })
defineProps<{ id: string; disabled?: boolean }>()
</script>

<template>
  <Select v-model="model" :disabled="disabled">
    <SelectTrigger :id="id" class="h-10 w-full">
      <SelectValue />
    </SelectTrigger>
    <SelectContent position="item-aligned" class="max-h-36">
      <SelectItem v-for="item in productUnits" :key="item" :value="item">{{ item }}</SelectItem>
    </SelectContent>
  </Select>
</template>
