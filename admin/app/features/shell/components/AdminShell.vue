<script setup lang="ts">
import { ConnectionIndicator, VersionUpdateControl } from '@obshaya/ui'

const route = useRoute()
const router = useRouter()
const ready = ref(false)
const tabs = [
  { label: 'Заметки', to: '/' },
  { label: 'Заявки', to: '/requests' },
  { label: 'Клиенты', to: '/clients' },
  { label: 'Обновления', to: '/updates' },
]
const activePath = computed(() => route.path === '/' ? '/' : `/${route.path.split('/')[1]}`)

onMounted(() => {
  if (sessionStorage.getItem('obshaya-admin-demo') !== '1') {
    navigateTo('/login')
    return
  }
  ready.value = true
})

function exitDemo() {
  sessionStorage.removeItem('obshaya-admin-demo')
  router.push('/login')
}
</script>

<template>
  <main v-if="ready" class="min-h-screen bg-slate-100 text-slate-900">
    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header class="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-lime-700">Управление лицензиями</p>
          <h1 class="mt-2 text-3xl font-semibold tracking-tight">Админ-панель</h1>
          <p class="mt-1 text-sm text-slate-600">Заметки, заявки, клиенты и обновления в одном месте.</p>
          <VersionUpdateControl current-version="0.1" available-version="0.2" />
        </div>
        <div class="flex items-center gap-3">
          <ConnectionIndicator />
          <button class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50" @click="exitDemo">Выйти</button>
        </div>
      </header>
      <nav class="mb-5 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2" aria-label="Разделы админ-панели">
        <NuxtLink v-for="tab in tabs" :key="tab.to" :to="tab.to" class="rounded-lg px-4 py-2 text-sm font-medium transition" :class="activePath === tab.to ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'">{{ tab.label }}</NuxtLink>
        <div v-if="activePath === '/' || activePath === '/updates'" class="ml-auto"><slot name="tab-actions" /></div>
      </nav>
      <slot />
      <p class="mt-5 text-center text-xs text-slate-500">Демонстрационный макет · API и лицензии пока не подключены</p>
    </div>
  </main>
</template>
