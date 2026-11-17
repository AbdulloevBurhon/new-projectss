<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<template>
  <main class="grid min-h-screen place-content-center p-8 text-center text-slate-700">
    <h1 class="text-3xl font-semibold tracking-tight">{{ title }}</h1>
    <p class="mt-2 text-slate-500">Раздел пока в разработке.</p>
  </main>
</template>
