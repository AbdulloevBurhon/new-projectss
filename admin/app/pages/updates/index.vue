<script setup lang="ts">
import AdminShell from '~/features/shell/components/AdminShell.vue'
import UpdatesPanel from '~/features/updates/components/UpdatesPanel.vue'

const updatesPanel = ref<{ openPublish: () => void } | null>(null)
</script>

<template>
  <AdminShell>
    <template #tab-actions>
      <button class="rounded-lg bg-lime-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-lime-200" @click="updatesPanel?.openPublish()">＋ Обновить</button>
    </template>
    <UpdatesPanel ref="updatesPanel" />
  </AdminShell>
</template>
