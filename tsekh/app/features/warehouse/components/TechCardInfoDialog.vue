<script setup lang="ts">
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@obshaya/ui'
import type { TechCard } from '../../../../endpoints/warehouse/techcards/techcards.types'
const open = defineModel<boolean>('open', { required: true })
defineProps<{ card: TechCard | null }>()
const money = (value: number) => new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
</script>

<template>
  <Dialog v-model:open="open"><DialogContent class="sm:max-w-2xl"><DialogHeader><DialogTitle>{{ card?.name }}</DialogTitle><DialogDescription>Информация и состав техкарты.</DialogDescription></DialogHeader>
    <template v-if="card"><div class="flex flex-wrap items-start gap-4"><img v-if="card.photo" :src="card.photo" :alt="card.name" class="size-24 rounded-xl border object-cover"><div class="flex-1 rounded-lg border p-3"><p class="text-sm text-muted-foreground">Цена продажи</p><p class="mt-1 font-semibold">{{ money(card.price) }} сом</p></div></div>
    <div class="space-y-2"><h3 class="font-medium">Состав</h3><div v-if="card.materials.length" class="max-h-[14rem] divide-y overflow-y-auto rounded-lg border"><div v-for="line in card.materials" :key="line.productId" class="flex items-center justify-between gap-4 p-3 text-sm"><span>{{ line.name }}<small v-if="line.pieces" class="ml-1 text-muted-foreground">({{ line.pieces }} {{ line.packageUnit ?? 'шт' }})</small></span><span class="font-medium">{{ line.quantity }} {{ line.unit }}</span></div></div><p v-else class="rounded-lg border p-4 text-center text-sm text-muted-foreground">Состав не указан.</p></div></template>
  </DialogContent></Dialog>
</template>
