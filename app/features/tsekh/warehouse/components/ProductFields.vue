<script setup lang="ts">
import type { ProductDraft } from '../types/inventory'
import { units } from '../utils/products'

const draft = defineModel<ProductDraft>({ required: true })
defineProps<{ disabled: boolean }>()
</script>

<template>
  <label class="inventory-field">Единица измерения
    <select v-model="draft.unit" required :disabled="disabled" @change="draft.unit !== 'шт' && (draft.packaged = false)">
      <option v-for="unit in units" :key="unit">{{ unit }}</option>
    </select>
  </label>
  <div class="product-content-fields">
    <label class="inventory-field">Единица содержимого
      <select v-model="draft.contentUnit" :disabled="disabled || !draft.packaged">
        <option v-for="unit in units" :key="unit">{{ unit }}</option>
      </select>
    </label>
    <label class="inventory-field">Количество в 1 шт
      <input v-model="draft.quantityPerPiece" type="number" min="0.001" max="1000000" step="0.001"
        :required="draft.packaged" :disabled="disabled || !draft.packaged" placeholder="Например, 5" />
    </label>
    <label class="product-content-toggle">
      <input v-model="draft.packaged" type="checkbox" :disabled="disabled || draft.unit !== 'шт'" />
      <span>Учёт</span>
      <span class="sr-only">содержимого</span>
    </label>
  </div>
</template>

<style scoped>
.product-content-fields { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto; align-items: end; gap: 8px; }
.product-content-fields select, .product-content-fields input[type='number'] { min-width: 0; width: 100%; }
.product-content-toggle { display: flex; align-items: center; gap: 5px; min-height: 39px; font-size: 12px; }
</style>
