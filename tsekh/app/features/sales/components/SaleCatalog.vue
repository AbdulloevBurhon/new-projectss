<script setup lang="ts">
import { Image, Plus } from '@lucide/vue'
import type { SaleProduct } from '../types/sale.types'

defineProps<{ products: SaleProduct[] }>()
const emit = defineEmits<{ add: [product: SaleProduct] }>()
</script>

<template>
  <div class="min-h-0 flex-1 overflow-y-auto">
    <div v-if="products.length" class="grid gap-2">
      <button v-for="product in products" :key="product.id" class="grid min-h-[76px] grid-cols-[56px_minmax(100px,1fr)_auto_auto_36px] items-center gap-3 rounded-lg border bg-background p-2 text-left transition hover:border-primary/40 hover:bg-muted/30" @click="emit('add', product)">
        <span class="grid size-14 place-items-center overflow-hidden rounded-md bg-muted text-muted-foreground"><img v-if="product.photo" :src="product.photo" :alt="product.name" class="size-full object-cover"><Image v-else class="size-5" /></span>
        <span class="min-w-0 truncate font-medium">{{ product.name }}</span>
        <span class="text-sm text-muted-foreground">{{ product.stock }} {{ product.unit }}</span>
        <span class="whitespace-nowrap text-sm font-medium">{{ product.price }} сом</span>
        <span class="grid size-8 place-items-center rounded-full bg-primary/10 text-primary"><Plus class="size-4" /></span>
      </button>
    </div>
    <div v-else class="grid min-h-48 place-items-center text-sm text-muted-foreground">Товары не найдены</div>
  </div>
</template>
