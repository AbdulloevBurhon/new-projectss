<script setup lang="ts">
import { Input } from '@obshaya/ui'
import type { Product } from '../../../../endpoints/warehouse/products/products.types'
import type { TechCardMaterialDraft } from '../../../../endpoints/warehouse/techcards/techcards.types'
import { materialLimit } from '../../../../endpoints/warehouse/techcards/techcards.service'

const line = defineModel<TechCardMaterialDraft>('line', { required: true })
const props = defineProps<{ product?: Product; disabled?: boolean }>()
function updatePieces(value: string) {
  line.value.pieces = value
  if (props.product?.quantityPerPiece) line.value.quantity = Math.min(Number(line.value.quantity) || 0, materialLimit(value, props.product.quantityPerPiece))
}
</script>

<template>
  <div class="grid items-end gap-3 rounded-lg border bg-background p-3" :class="product?.quantityPerPiece ? 'sm:grid-cols-[minmax(0,1fr)_6rem_7rem]' : 'sm:grid-cols-[minmax(0,1fr)_7rem]'">
    <p class="min-w-0 truncate pb-2 text-sm font-medium">{{ product?.name ?? line.name }}</p>
    <label v-if="product?.quantityPerPiece" class="grid gap-1 text-xs text-muted-foreground">{{ product.unit }}
      <Input type="number" :min="product.unit === 'кг' ? 0.001 : 1" max="1000000" :step="product.unit === 'кг' ? 0.001 : 1" :model-value="line.pieces" :aria-label="`Количество ${product.unit}`" :disabled="disabled" @update:model-value="updatePieces(String($event))" />
    </label>
    <label class="grid gap-1 text-xs text-muted-foreground">{{ line.unit }}
      <Input v-model="line.quantity" type="number" min="0.001" max="1000000" step="0.001" :aria-label="`Количество ${line.name} в ${line.unit}`" :disabled="disabled" />
    </label>
  </div>
</template>
