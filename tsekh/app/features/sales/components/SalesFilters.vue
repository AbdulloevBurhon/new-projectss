<script setup lang="ts">
import { Search } from '@lucide/vue'
import { Input } from '@obshaya/ui'

const props = defineProps<{
  warehouses: string[]
  accounts: string[]
  categories: string[]
}>()
const search = defineModel<string>('search', { required: true })
const warehouse = defineModel<string>('warehouse', { required: true })
const account = defineModel<string>('account', { required: true })
const category = defineModel<string>('category', { required: true })
</script>

<template>
  <div class="grid gap-2 md:grid-cols-[minmax(180px,1fr)_repeat(3,minmax(120px,0.7fr))]">
    <label class="relative"><Search class="absolute left-3 top-3 size-4 text-muted-foreground" /><Input v-model="search" class="pl-9" placeholder="Поиск товаров" /></label>
    <select v-model="warehouse" class="h-10 rounded-md border bg-background px-3 text-sm"><option v-for="item in props.warehouses" :key="item">{{ item }}</option></select>
    <select v-model="account" class="h-10 rounded-md border bg-background px-3 text-sm"><option v-for="item in props.accounts" :key="item">{{ item }}</option></select>
    <select v-model="category" class="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Все категории</option><option v-for="item in props.categories" :key="item">{{ item }}</option></select>
  </div>
</template>
