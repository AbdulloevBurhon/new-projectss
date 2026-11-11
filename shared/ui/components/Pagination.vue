<script setup lang="ts">
import { useId } from 'vue'

const page = defineModel<number>({ default: 1 })
const pageSize = defineModel<number>('pageSize', { default: 10 })
const props = withDefaults(defineProps<{ totalItems: number; pageSizeOptions?: number[] }>(), { pageSizeOptions: () => [10, 30, 100] })
const id = useId()
const pageCount = computed(() => Math.max(1, Math.ceil(props.totalItems / pageSize.value)))
const rangeStart = computed(() => props.totalItems ? (page.value - 1) * pageSize.value + 1 : 0)
const rangeEnd = computed(() => Math.min(page.value * pageSize.value, props.totalItems))
watch(pageSize, () => { page.value = 1 })
watch(pageCount, count => { if (page.value > count) page.value = count })
</script>

<template>
  <nav class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-3 py-2.5 text-sm text-slate-600" aria-label="Пагинация">
    <span>{{ rangeStart }}–{{ rangeEnd }} из {{ totalItems }}</span>
    <div class="flex items-center gap-2">
      <label class="sr-only" :for="`page-size-${id}`">Строк на странице</label>
      <select :id="`page-size-${id}`" v-model.number="pageSize" class="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm outline-none focus:border-blue-500">
        <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
      </select>
      <button type="button" class="grid size-9 place-items-center rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Предыдущая страница" :disabled="page <= 1" @click="page--">
        <svg aria-hidden="true" viewBox="0 0 20 20" class="size-4" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="m12 4-6 6 6 6" /></svg>
      </button>
      <span class="min-w-12 text-center">{{ page }} / {{ pageCount }}</span>
      <button type="button" class="grid size-9 place-items-center rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Следующая страница" :disabled="page >= pageCount" @click="page++">
        <svg aria-hidden="true" viewBox="0 0 20 20" class="size-4" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="m8 4 6 6-6 6" /></svg>
      </button>
    </div>
  </nav>
</template>
