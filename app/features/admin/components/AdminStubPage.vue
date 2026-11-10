<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<template>
  <main class="mx-auto max-w-6xl p-6 md:p-10">
    <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Админ-панель · заглушка</p>
    <h1 class="mt-3 text-3xl font-semibold">{{ title }}</h1>
    <p class="mt-3 text-sm text-slate-600">Раздел будет подключён к Cloudflare Worker на следующем этапе.</p>
  </main>
</template>
