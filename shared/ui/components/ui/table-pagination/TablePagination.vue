<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { Button } from '../button'
import { computed } from 'vue'

const props = withDefaults(defineProps<{ total: number; page: number; pageSize: number; pageSizeOptions?: number[] }>(), { pageSizeOptions: () => [10, 25, 50] })
const emit = defineEmits(['update:page', 'update:pageSize'])
const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
const first = computed(() => props.total ? (props.page - 1) * props.pageSize + 1 : 0)
const last = computed(() => Math.min(props.page * props.pageSize, props.total))

function resize(event: Event) {
  emit('update:pageSize', Number((event.target as HTMLSelectElement).value))
  emit('update:page', 1)
}
</script>

<template>
  <footer class="flex flex-col gap-3 border-t px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
    <span>Показано {{ first }}–{{ last }} из {{ total }}</span>
    <div class="flex items-center gap-2 sm:gap-3">
      <span>Показать</span>
      <select :value="pageSize" class="h-9 rounded-md border bg-background px-3 text-foreground" aria-label="Количество строк" @change="resize">
        <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
      </select>
      <Button size="icon" variant="outline" aria-label="Предыдущая страница" :disabled="page <= 1" @click="emit('update:page', page - 1)"><ChevronLeft /></Button>
      <Button size="icon" class="h-9 w-9" aria-current="page" :aria-label="`Страница ${page} из ${pageCount}`">{{ page }}</Button>
      <Button size="icon" variant="outline" aria-label="Следующая страница" :disabled="page >= pageCount" @click="emit('update:page', page + 1)"><ChevronRight /></Button>
    </div>
  </footer>
</template>
