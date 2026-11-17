<script setup lang="ts">
import { Settings, ShoppingCart, Users, Wallet, Warehouse } from '@lucide/vue'

const cards = [
  { label: 'Склады', to: '/warehouses', icon: Warehouse },
  { label: 'Счёт', to: '/accounts', icon: Wallet },
  { label: 'Сотрудники', to: '/workers', icon: Users },
  { label: 'Продажа', to: '/sales', icon: ShoppingCart },
  { label: 'Настройки', to: '/settings', icon: Settings },
]
</script>

<template>
  <main class="min-h-screen p-6 text-slate-900 sm:p-10">
    <h1 class="text-3xl font-semibold tracking-tight">Цех</h1>
    <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <NuxtLink
        v-for="card in cards"
        :key="card.to"
        :to="card.to"
        class="flex min-h-28 items-center gap-4 rounded-xl border bg-background p-5 transition hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span class="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <component :is="card.icon" class="size-5" />
        </span>
        <span class="text-lg font-medium">{{ card.label }}</span>
      </NuxtLink>
    </div>
  </main>
</template>
