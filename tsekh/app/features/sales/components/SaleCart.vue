<script setup lang="ts">
import { Minus, Plus, ShoppingCart } from '@lucide/vue'
import { Button } from '@obshaya/ui'
import type { SaleCartLine } from '../types/sale.types'

defineProps<{ items: SaleCartLine[]; total: number }>()
const emit = defineEmits<{ quantity: [id: string, delta: number]; clear: []; pay: [] }>()
</script>

<template>
  <section class="flex min-h-[430px] flex-col overflow-hidden rounded-xl border bg-background xl:h-full xl:min-h-0">
    <header class="flex items-center justify-between border-b p-4"><div><h2 class="font-semibold">Корзина</h2><p class="text-xs text-muted-foreground">Позиции продажи</p></div><Button v-if="items.length" variant="ghost" size="sm" @click="emit('clear')">Очистить</Button></header>
    <div class="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
      <article v-for="item in items" :key="item.id" class="grid grid-cols-[52px_minmax(70px,1fr)_auto] items-center gap-2 rounded-lg border p-2">
        <span class="grid size-12 place-items-center rounded-md bg-muted text-xs text-muted-foreground">Фото</span>
        <div class="min-w-0"><p class="truncate text-sm font-medium">{{ item.name }}</p><p class="text-xs text-muted-foreground">{{ item.price }} сом / {{ item.unit }}</p></div>
        <div class="flex items-center gap-1"><Button variant="outline" size="icon" class="size-7" :aria-label="`Уменьшить ${item.name}`" @click="emit('quantity', item.id, -1)"><Minus class="size-3" /></Button><span class="min-w-5 text-center text-sm">{{ item.quantity }}</span><Button variant="outline" size="icon" class="size-7" :aria-label="`Увеличить ${item.name}`" :disabled="item.quantity >= item.stock" @click="emit('quantity', item.id, 1)"><Plus class="size-3" /></Button></div>
        <strong class="col-span-3 text-right text-sm">{{ item.price * item.quantity }} сом</strong>
      </article>
      <div v-if="!items.length" class="grid min-h-48 place-items-center text-center text-sm text-muted-foreground"><div><ShoppingCart class="mx-auto mb-2 size-7 opacity-50" />Выберите товары справа</div></div>
    </div>
    <footer class="flex items-center justify-between gap-3 border-t px-4 py-2"><div class="flex items-center gap-2"><span class="text-sm text-muted-foreground">Итого</span><strong class="text-base">{{ total.toLocaleString('ru-RU') }} сом</strong></div><Button class="min-w-36 px-8" size="sm" :disabled="!items.length" @click="emit('pay')">Оплата</Button></footer>
  </section>
</template>
