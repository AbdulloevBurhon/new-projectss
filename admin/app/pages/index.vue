<script setup lang="ts">
import { Archive, Bell, NotebookPen, UsersRound, Inbox, RefreshCw } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { Button, Input, Label, Tabs, TabsContent, TabsList, TabsTrigger, Toaster, toast } from '@obshaya/ui'
import { clearAdminKey, checkAdminKey, getAdminKey, setAdminKey } from '../../admin-endpoints/core/admin-api'
import { listRequests } from '../../admin-endpoints/requests/requests.service'
import { requests } from '../features/admin-state'
import NotesPanel from '../features/notes/components/NotesPanel.vue'
import RequestsPanel from '../features/requests/components/RequestsPanel.vue'
import ClientsPanel from '../features/clients/components/ClientsPanel.vue'
import UpdatesPanel from '../features/updates/components/UpdatesPanel.vue'
import ArchivesPanel from '../features/archives/components/ArchivesPanel.vue'

const activeTab = ref('notes')
const authenticated = ref(false)
const checkingSession = ref(true)
const adminKey = ref('')
const loginError = ref('')
const loginBusy = ref(false)
const refreshingRequests = ref(false)
const titles: Record<string, string> = { notes: 'Заметки', requests: 'Заявки', clients: 'Клиенты', updates: 'Обновления', archives: 'Архивация' }
const title = computed(() => titles[activeTab.value] ?? 'Админ-панель')

onMounted(async () => {
  const savedKey = getAdminKey()
  if (savedKey) authenticated.value = await checkAdminKey(savedKey).catch(() => false)
  if (!authenticated.value) clearAdminKey()
  checkingSession.value = false
})

async function login() {
  if (!adminKey.value.trim() || loginBusy.value) return
  loginBusy.value = true; loginError.value = ''
  try {
    if (!await checkAdminKey(adminKey.value.trim())) throw new Error('Ключ администратора не принят')
    setAdminKey(adminKey.value.trim()); authenticated.value = true; adminKey.value = ''
  } catch (error) { loginError.value = error instanceof Error ? error.message : 'Не удалось войти' }
  finally { loginBusy.value = false }
}

function logout() { clearAdminKey(); authenticated.value = false }

async function refreshRequests() {
  if (refreshingRequests.value) return
  refreshingRequests.value = true
  try { requests.value = await listRequests(); toast.success('Заявки обновлены') }
  catch (error) { toast.error(error instanceof Error ? error.message : 'Не удалось загрузить заявки') }
  finally { refreshingRequests.value = false }
}
</script>

<template>
  <main class="min-h-screen bg-muted/40 px-8 py-6 text-foreground sm:px-10 lg:px-12">
    <section v-if="checkingSession" class="mx-auto mt-24 max-w-md rounded-2xl border bg-background p-8 text-center text-sm text-muted-foreground">Проверка доступа…</section>
    <form v-else-if="!authenticated" class="mx-auto mt-20 w-full max-w-md space-y-5 rounded-2xl border bg-background p-8 shadow-sm" @submit.prevent="login">
      <div><p class="text-xs font-semibold uppercase tracking-[0.18em] text-lime-700">Общая программа</p><h1 class="mt-2 text-2xl font-semibold">Вход администратора</h1><p class="mt-2 text-sm text-muted-foreground">Введите секретный ключ API. Он хранится до закрытия вкладки.</p></div>
      <div class="space-y-2"><Label for="admin-api-key">Ключ администратора</Label><Input id="admin-api-key" v-model="adminKey" type="password" autocomplete="current-password" autofocus /></div>
      <p v-if="loginError" class="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">{{ loginError }}</p>
      <Button class="w-full" :disabled="loginBusy || !adminKey.trim()">{{ loginBusy ? 'Проверка…' : 'Войти' }}</Button>
    </form>
    <div v-else class="w-full space-y-6">
      <div class="flex items-center justify-between gap-4"><h1 class="text-3xl font-semibold tracking-tight">{{ title }}</h1><Button variant="outline" @click="logout">Выйти</Button></div>
      <Tabs v-model:model-value="activeTab" class="gap-5" style="margin-top: 1.5rem">
        <div class="flex flex-wrap items-center gap-2">
          <TabsList class="h-11 w-fit flex-wrap justify-start gap-0.5 rounded-xl bg-muted p-1.5">
            <TabsTrigger value="notes" class="h-9 flex-none rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"><NotebookPen class="size-4" style="color: #2563eb" />Заметки</TabsTrigger>
            <TabsTrigger value="requests" class="h-9 flex-none rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"><Inbox class="size-4" style="color: #d97706" />Заявки</TabsTrigger>
            <TabsTrigger value="clients" class="h-9 flex-none rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"><UsersRound class="size-4" style="color: #059669" />Клиенты</TabsTrigger>
            <TabsTrigger value="updates" class="h-9 flex-none rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"><Bell class="size-4" style="color: #7c3aed" />Обновления</TabsTrigger>
            <TabsTrigger value="archives" class="h-9 flex-none rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"><Archive class="size-4" style="color: #0891b2" />Архивация</TabsTrigger>
          </TabsList>
          <Button variant="outline" size="icon" aria-label="Обновить заявки" title="Обновить заявки" :disabled="refreshingRequests" @click="refreshRequests">
            <RefreshCw class="size-4" :class="{ 'animate-spin': refreshingRequests }" />
          </Button>
        </div>
        <TabsContent value="notes" class="mt-0"><NotesPanel /></TabsContent>
        <TabsContent value="requests" class="mt-0"><RequestsPanel /></TabsContent>
        <TabsContent value="clients" class="mt-0"><ClientsPanel /></TabsContent>
        <TabsContent value="updates" class="mt-0"><UpdatesPanel /></TabsContent>
        <TabsContent value="archives" class="mt-0"><ArchivesPanel /></TabsContent>
      </Tabs>
    </div>
    <Toaster position="bottom-right" />
  </main>
</template>

