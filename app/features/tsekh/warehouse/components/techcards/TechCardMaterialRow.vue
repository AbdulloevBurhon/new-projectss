<script setup lang="ts">
import WorkshopIcon from '~/features/tsekh/components/WorkshopIcon.vue'
import type { MaterialDraft, Product } from '../../types/inventory'
import { quantity } from '../../utils/format'
import { materialLimit } from '../../utils/techcards'

const props = defineProps<{ item: MaterialDraft; product?: Product; disabled?: boolean }>()
defineEmits<{ remove: [] }>()
const capacity = computed(() => props.product?.quantityPerPiece)
const limit = computed(() => {
  const pieces = Number(props.item.pieces)
  return capacity.value && Number.isInteger(pieces) && pieces > 0 ? materialLimit(pieces, capacity.value) : undefined
})

function setExpense(event: Event) {
  const input = event.target as HTMLInputElement
  const maximum = limit.value ?? 1_000_000
  if (input.valueAsNumber > maximum) {
    input.value = String(maximum)
  }
  props.item.quantity = input.value
}

function setPieces(event: Event) {
  const input = event.target as HTMLInputElement
  props.item.pieces = input.value
  const maximum = limit.value
  if (maximum !== undefined && Number(props.item.quantity) > maximum) {
    props.item.quantity = maximum
  }
}
</script>

<template>
  <tr class="techcard-material-row">
    <td>
      <strong>{{ item.name }}</strong>
      <template v-if="capacity">
        <small class="table-secondary">1 шт · {{ quantity(capacity) }} {{ item.unit }}</small>
        <small v-if="limit !== undefined" class="table-secondary">До {{ quantity(limit) }} {{ item.unit }}</small>
      </template>
      <small v-else-if="!product" class="table-secondary">Из истории</small>
    </td>
    <td>
      <label v-if="capacity" class="number-field">
        <input :value="item.pieces" type="number" min="1" max="1000000" step="1"
          required :disabled="disabled" :aria-label="`Штук: ${item.name}`" @input="setPieces" />
        <span>шт</span>
      </label>
      <span v-else>—</span>
    </td>
    <td>
      <label class="number-field">
        <input :value="item.quantity" type="number" min="0.001" :max="limit ?? 1000000"
          step="0.001" required :disabled="disabled || (!!capacity && limit === undefined)" :aria-label="`Расход: ${item.name}`"
          @input="setExpense" @change="setExpense" />
        <span>{{ item.unit }}</span>
      </label>
    </td>
    <td>
      <button type="button" class="icon-button danger" :disabled="disabled" :aria-label="`Убрать: ${item.name}`" @click="$emit('remove')">
        <WorkshopIcon name="trash" />
      </button>
    </td>
  </tr>
</template>
