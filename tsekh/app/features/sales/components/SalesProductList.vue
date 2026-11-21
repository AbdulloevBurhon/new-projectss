<script setup lang="ts">
import { Button } from '@obshaya/ui'
import { ref, watch } from 'vue'
import type { SaleGoods } from '../../../../endpoints/sales/service'

const props = defineProps<{ rows: SaleGoods[]; pending: boolean; more: boolean; error: string; listKey: string }>()
const emit = defineEmits<{ add: [row: SaleGoods]; more: [] }>()
const list = ref<HTMLElement>()
const end = ref<HTMLElement>()
const stockFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 })
watch(() => props.listKey, () => { if (list.value) list.value.scrollTop = 0 })
watch([list, end], ([root, target], _, cleanup) => {
  if (!root || !target) return
  const observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) emit('more')
  }, { root })
  observer.observe(target)
  cleanup(() => observer.disconnect())
}, { flush: 'post' })
</script>

<template>
  <div ref="list" role="region" aria-label="Каталог товаров" tabindex="0"
    class="min-h-0 max-h-[65dvh] space-y-2 overflow-y-auto xl:max-h-none">
    <button v-for="p in rows" :key="p.id" type="button" :title="`В корзину: ${p.name}`" :aria-label="`В корзину ${p.name}`"
      class="flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-left hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
      @click="emit('add', p)">
      <strong class="mr-auto min-w-0 break-words">{{ p.name }}</strong>
      <span class="shrink-0 text-sm text-muted-foreground tabular-nums">{{ stockFormat.format(p.stock) }} {{ p.unit }}</span>
      <span class="shrink-0 text-sm font-medium tabular-nums">{{ p.price }} сом</span>
    </button>
    <p v-if="pending" role="status" class="px-3 py-2 text-sm text-muted-foreground">Загрузка товаров…</p>
    <div v-else-if="error" class="flex flex-wrap items-center gap-2 p-3 text-sm">
      <p role="alert" class="text-destructive">{{ error }}</p>
      <Button size="sm" variant="outline" @click="emit('more')">Повторить</Button>
    </div>
    <p v-else-if="!rows.length && !more" class="p-4 text-muted-foreground">Товаров в наличии нет</p>
    <div v-if="more && !pending && !error && rows.length" ref="end" class="h-px" aria-hidden="true" />
  </div>
</template>
