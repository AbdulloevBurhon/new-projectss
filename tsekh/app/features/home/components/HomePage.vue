<script setup lang="ts">
import { ChartColumn, ChartPie, ClipboardCheck, Contact, Settings, ShoppingCart, Users, Wallet, Warehouse } from '@lucide/vue'
import { computed } from 'vue'
import { useEmployeeAccess } from '../../workers/composables/useEmployeeAccess'

const { canVisit } = useEmployeeAccess()

const cards = [
  { label: 'Склады', to: '/warehouses', icon: Warehouse },
  { label: 'Ревизия', to: '/revision', icon: ClipboardCheck },
  { label: 'Счёт', to: '/accounts', icon: Wallet },
  { label: 'Сотрудники', to: '/workers', icon: Users },
  { label: 'Клиенты', to: '/clients', icon: Contact },
  { label: 'Продажа', to: '/sales', icon: ShoppingCart },
  { label: 'Отчёты', to: '/reports', icon: ChartColumn },
  { label: 'Итоги', to: '/summary', icon: ChartPie },
  { label: 'Настройки', to: '/settings', icon: Settings },
]
const visibleCards = computed(() => cards.filter(card => canVisit(card.to)))
</script>

<template>
  <main class="min-h-screen p-6 text-slate-900 sm:p-10">
    <h1 class="text-3xl font-semibold tracking-tight">Цех</h1>
    <p v-if="!visibleCards.length" class="mt-6 text-sm text-muted-foreground">Администратор ещё не открыл доступ к разделам.</p>
    <div v-else class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <NuxtLink
        v-for="card in visibleCards"
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
