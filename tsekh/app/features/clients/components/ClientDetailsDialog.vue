<script setup lang="ts">
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@obshaya/ui'
defineProps<{ client: { name: string; phone: string; debt: number } }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Dialog :open="true" @update:open="open => { if (!open) emit('close') }">
    <DialogContent>
      <DialogHeader><DialogTitle>{{ client.name }}</DialogTitle></DialogHeader>
      <dl class="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-sm">
        <dt>Телефон</dt><dd>{{ client.phone }}</dd>
        <dt>Долг</dt><dd>{{ client.debt.toLocaleString('ru-RU') }} сом</dd>
      </dl>
    </DialogContent>
  </Dialog>
</template>
