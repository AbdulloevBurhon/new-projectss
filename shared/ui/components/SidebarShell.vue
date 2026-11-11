<script setup lang="ts">
const collapsed = defineModel<boolean>('collapsed', { default: false })
</script>

<template>
  <div class="flex min-h-screen bg-slate-100">
    <aside class="relative shrink-0 border-r border-slate-200 bg-slate-900 text-white transition-[width] duration-200" :class="collapsed ? 'w-16' : 'w-64'">
      <div class="min-h-full p-3"><slot :collapsed="collapsed" /></div>
      <button type="button" class="absolute right-0 top-4 translate-x-1/2 rounded-full border border-slate-600 bg-slate-800 px-2 py-1 text-white" :aria-label="collapsed ? 'Открыть меню' : 'Свернуть меню'" @click="collapsed = !collapsed">
        {{ collapsed ? '›' : '‹' }}
      </button>
    </aside>
    <main class="min-w-0 flex-1"><slot name="content" /></main>
  </div>
</template>
