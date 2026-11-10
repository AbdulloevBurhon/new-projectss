<script setup lang="ts">
import InventoryIcon from '~/features/tsekh/components/WorkshopIcon.vue'
import type { Product } from '../types/inventory'
import { money, quantity, validNumber } from '../utils/format'
import type { ReceiptInputs } from '../utils/receipts'

const props = defineProps<{ product: Product; input: ReceiptInputs; sum: number; balance?: number; disabled: boolean; canSelect: boolean }>()
defineEmits<{ reset: []; post: [] }>()
const insufficient = computed(() => props.balance !== undefined && Math.round(props.sum * 100) > props.balance && props.sum > 0)
const canPost = computed(() => {
  const amount = Number(props.input.quantity)
  const price = Number(props.input.price)
  return props.canSelect && props.balance !== undefined && !insufficient.value && props.sum > 0
    && amount > 0 && validNumber(amount, 1000) && validNumber(price, 100)
    && (!props.product.quantityPerPiece || Number.isInteger(amount))
})
</script>

<template>
  <tr>
    <td>
      <span class="table-item"><span class="table-icon"><InventoryIcon name="products" /></span><strong>{{ product.name }}</strong></span>
      <small v-if="product.quantityPerPiece" class="table-secondary">{{ quantity(product.quantityPerPiece) }} {{ product.contentUnit }} в 1 шт</small>
    </td>
    <td>
      <div class="number-field">
        <input v-model="input.quantity" type="number" min="0" max="1000000" :step="product.quantityPerPiece ? 1 : 0.001"
          placeholder="0" :disabled="disabled" :aria-label="`Количество: ${product.name}`" />
        <span>{{ product.quantityPerPiece ? 'шт' : product.unit }}</span>
      </div>
      <small v-if="product.quantityPerPiece && Number(input.quantity) > 0" class="table-secondary">
        {{ quantity(product.quantityPerPiece * Number(input.quantity)) }} {{ product.contentUnit }}
      </small>
    </td>
    <td>
      <div class="number-field">
        <input v-model="input.price" type="number" min="0" max="1000000" step="0.01" placeholder="0,00"
          :disabled="disabled" :aria-label="`Цена: ${product.name}`" />
        <span>сом</span>
      </div>
    </td>
    <td class="numeric-cell">
      <strong>{{ money(sum) }}</strong>
      <small v-if="insufficient" class="table-secondary receipt-insufficient">Недостаточно средств</small>
    </td>
    <td class="table-actions">
      <div class="inventory-actions">
        <button type="button" class="icon-button secondary receipt-reset" title="Сбросить строку" :disabled="disabled || (!input.quantity && !input.price)"
          :aria-label="`Сбросить: ${product.name}`" @click="$emit('reset')"><InventoryIcon name="reset" /></button>
        <button type="button" class="icon-button primary" title="Провести поступление" :disabled="disabled || !canPost"
          :aria-label="`Провести поступление: ${product.name}`" @click="$emit('post')"><InventoryIcon name="check" /></button>
      </div>
    </td>
  </tr>
</template>
