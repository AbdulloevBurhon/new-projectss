<script setup lang="ts">
import NotesPanel from '~/features/notes/components/NotesPanel.vue'
import AdminShell from '~/features/shell/components/AdminShell.vue'

const notesPanel = ref<{ openCreate: () => void } | null>(null)
</script>

<template>
  <AdminShell>
    <template #tab-actions>
      <button class="rounded-lg bg-lime-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-lime-200" @click="notesPanel?.openCreate()">＋ Добавить заметку</button>
    </template>
    <NotesPanel ref="notesPanel" />
  </AdminShell>
</template>
