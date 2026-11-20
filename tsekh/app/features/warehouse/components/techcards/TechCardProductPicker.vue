<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Check, ChevronDown } from '@lucide/vue'
import { Input } from '@obshaya/ui'
import type { Product } from '../../../../../endpoints/warehouse/products/products.types'
import { stockUnit } from '../../../../../endpoints/warehouse/techcards/techcards.service'

const props = defineProps<{ products: Product[]; selectedIds: Set<string>; disabled?: boolean }>()
const emit = defineEmits<{ toggle: [product: Product] }>()
const search = ref('')
const open = ref(false)
const root = ref<HTMLElement | null>(null)
const filteredProducts = computed(() => props.products.filter(item => item.name.toLocaleLowerCase('ru').includes(search.value.trim().toLocaleLowerCase('ru'))))

function closeOutside(event: PointerEvent) {
  if (root.value && !root.value.contains(event.target as Node)) open.value = false
}
onMounted(() => document.addEventListener('pointerdown', closeOutside))
onBeforeUnmount(() => document.removeEventListener('pointerdown', closeOutside))
</script>

<template>
  <div ref="root" class="relative">
    <label class="mb-1.5 block text-sm font-medium">Товары</label>
    <div class="relative">
      <Input v-model="search" type="search" placeholder="Найти и добавить товар" aria-label="Поиск и выбор товаров" :disabled="disabled" @focus="open = true" @click="open = true" />
      <ChevronDown class="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
    <div v-if="open && !disabled" class="absolute z-50 mt-1 max-h-[13.25rem] w-full overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg">
      <button v-for="product in filteredProducts" :key="product.id" type="button" class="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm hover:bg-accent" @click="emit('toggle', product)">
        <span class="flex size-4 shrink-0 items-center justify-center rounded border" :class="selectedIds.has(product.id) ? 'border-primary bg-primary text-primary-foreground' : 'border-input'"><Check v-if="selectedIds.has(product.id)" class="size-3" /></span>
        <span class="min-w-0 flex-1 truncate">{{ product.name }}</span>
        <span class="shrink-0 text-xs text-muted-foreground">{{ stockUnit(product) }}<template v-if="product.quantityPerPiece"> · {{ product.quantityPerPiece }} {{ product.contentUnit }} / {{ product.unit }}</template></span>
      </button>
      <p v-if="!filteredProducts.length" class="px-3 py-4 text-center text-sm text-muted-foreground">{{ products.length ? 'Совпадений не найдено' : 'Сначала добавьте товары' }}</p>
    </div>
  </div>
</template>
