<script setup lang="ts">
import { Bell, NotebookPen, UsersRound, Inbox } from '@lucide/vue'
import { computed, ref } from 'vue'
import { Tabs, TabsContent, TabsList, TabsTrigger, Toaster } from '@obshaya/ui'
import NotesPanel from '../features/notes/components/NotesPanel.vue'
import RequestsPanel from '../features/requests/components/RequestsPanel.vue'
import ClientsPanel from '../features/clients/components/ClientsPanel.vue'
import UpdatesPanel from '../features/updates/components/UpdatesPanel.vue'

const activeTab = ref('notes')
const titles: Record<string, string> = { notes: 'Заметки', requests: 'Заявки', clients: 'Клиенты', updates: 'Обновления' }
const title = computed(() => titles[activeTab.value] ?? 'Админ-панель')
</script>

<template>
  <main class="min-h-screen bg-muted/40 px-8 py-6 text-foreground sm:px-10 lg:px-12">
    <div class="w-full space-y-6">
      <h1 class="text-3xl font-semibold tracking-tight">{{ title }}</h1>
      <Tabs v-model:model-value="activeTab" class="gap-5" style="margin-top: 1.5rem">
        <TabsList class="h-11 w-fit flex-wrap justify-start gap-0.5 rounded-xl bg-muted p-1.5">
          <TabsTrigger value="notes" class="h-9 flex-none rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"><NotebookPen class="size-4" style="color: #2563eb" />Заметки</TabsTrigger>
          <TabsTrigger value="requests" class="h-9 flex-none rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"><Inbox class="size-4" style="color: #d97706" />Заявки</TabsTrigger>
          <TabsTrigger value="clients" class="h-9 flex-none rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"><UsersRound class="size-4" style="color: #059669" />Клиенты</TabsTrigger>
          <TabsTrigger value="updates" class="h-9 flex-none rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"><Bell class="size-4" style="color: #7c3aed" />Обновления</TabsTrigger>
        </TabsList>
        <TabsContent value="notes" class="mt-0"><NotesPanel /></TabsContent>
        <TabsContent value="requests" class="mt-0"><RequestsPanel /></TabsContent>
        <TabsContent value="clients" class="mt-0"><ClientsPanel /></TabsContent>
        <TabsContent value="updates" class="mt-0"><UpdatesPanel /></TabsContent>
      </Tabs>
    </div>
    <Toaster position="bottom-right" />
  </main>
</template>

