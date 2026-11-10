<script setup lang="ts">
import type { ProductId } from '../types/admin.types'
import { useAdminApi } from '../services/adminApi'
import { useAdminStore } from '../stores/admin.store'
import { dateInput, formatDate, productNames } from '../utils/format'

defineProps<{ section: 'requests' | 'clients' | 'updates' }>()
const store = useAdminStore()
const { loading: isLoading, error: storeError } = store
const api = useAdminApi()
const query = ref('')
const busy = ref(false)
const notice = ref('')
const error = ref('')
const tempPin = ref('')
const tempPinExpiresAt = ref(0)
const requestDrafts = reactive<Record<string, { clientName: string; years: number; productId: ProductId }>>({})
const upload = reactive({ productId: 'tsekh' as ProductId, version: '', notes: '', file: null as File | null, allClients: true, licenseIds: [] as string[] })
const titles = { requests: 'Заявки на активацию', clients: 'Клиенты и лицензии', updates: 'Обновления программ' }

async function perform(action: () => Promise<unknown>, success: string) {
  busy.value = true; error.value = ''; notice.value = ''
  try { await action(); await store.refresh(); notice.value = success; return true }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'Операция не выполнена.'; return false }
  finally { busy.value = false }
}

async function decide(row: NonNullable<typeof store.overview.value>['requests'][number], approve: boolean) {
  const draft = requestDrafts[row.id]
  if (approve && !draft?.clientName.trim()) { error.value = 'Укажите имя клиента.'; return }
  await perform(() => api.decideRequest(row.id, approve, draft?.clientName.trim() || '', draft?.years || 5, draft?.productId || 'tsekh'), approve ? 'Заявка одобрена.' : 'Заявка отклонена.')
}

async function editName(id: string, current: string) {
  const name = prompt('Новое имя клиента:', current)?.trim()
  if (!name) return
  await perform(() => api.rename(id, name), 'Имя клиента изменено.')
}
async function editTerm(id: string, current: number) {
  const value = prompt('Новая дата окончания (ГГГГ-ММ-ДД):', dateInput(current))
  if (!value) return
  const date = new Date(`${value}T23:59:59Z`)
  if (!Number.isFinite(date.getTime())) { error.value = 'Проверьте дату.'; return }
  await perform(() => api.setExpiry(id, Math.floor(date.getTime() / 1000)), 'Срок лицензии обновлён.')
}
async function issuePin(id: string) {
  busy.value = true; error.value = ''; tempPin.value = ''
  try { const result = await api.resetPin(id); tempPin.value = result.temporaryPin; tempPinExpiresAt.value = result.expiresAt }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'Не удалось выдать PIN.' }
  finally { busy.value = false }
}
async function toggleLicense(id: string, active: boolean) {
  if (!confirm(active ? 'Включить лицензию клиента?' : 'Отключить лицензию клиента?')) return
  await perform(() => api.setLicenseStatus(id, active), active ? 'Лицензия включена.' : 'Лицензия отключена.')
}
async function publish() {
  if (!upload.file) { error.value = 'Выберите файл обновления.'; return }
  const form = new FormData()
  form.set('productId', upload.productId); form.set('version', upload.version); form.set('notes', upload.notes)
  form.set('file', upload.file); form.set('allClients', String(upload.allClients))
  form.set('licenseIds', upload.licenseIds.join(','))
  if (await perform(() => api.publishRelease(form), 'Обновление опубликовано.')) upload.file = null
}

onMounted(() => { if (import.meta.client && sessionStorage.getItem('obshaya-admin-key') && !store.overview.value) store.refresh().catch(() => {}) })
const requests = computed(() => (store.overview.value?.requests || []).filter(item => item.status === 'pending'))
watch(requests, rows => rows.forEach(row => { requestDrafts[row.id] ||= { clientName: '', years: 5, productId: row.product_id || 'tsekh' } }), { immediate: true })
const clients = computed(() => (store.overview.value?.licenses || []).filter(item => `${item.client_name} ${item.device_id}`.toLowerCase().includes(query.value.toLowerCase())))
const releases = computed(() => store.overview.value?.releases || [])
const eligibleLicenses = computed(() => (store.overview.value?.licenses || []).filter(row => row.product_id === upload.productId && row.status === 'active' && row.expires_at > Date.now() / 1000))
</script>

<template>
  <main class="mx-auto max-w-7xl p-5 md:p-8">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div><p class="text-xs font-bold uppercase tracking-widest text-lime-700">Управление лицензиями</p><h1 class="mt-2 text-2xl font-semibold">{{ titles[section] }}</h1></div>
      <div class="flex gap-2"><button class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm" :disabled="busy" @click="store.refresh()">Обновить</button><button class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm" @click="store.logout(); navigateTo('/admin/login')">Выйти</button></div>
    </div>
    <nav class="mb-5 flex flex-wrap gap-2"><NuxtLink v-for="item in [{ id: 'requests', label: 'Заявки' }, { id: 'clients', label: 'Клиенты' }, { id: 'messages', label: 'Сообщения' }, { id: 'updates', label: 'Обновления' }]" :key="item.id" :to="`/admin/${item.id}`" class="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium">{{ item.label }}</NuxtLink></nav>
    <p v-if="error || storeError" role="alert" class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{{ error || storeError }}</p>
    <p v-if="notice" role="status" class="mb-4 rounded-lg bg-lime-50 p-3 text-sm text-lime-800">{{ notice }}</p>
    <section v-if="!store.overview.value && isLoading" class="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">Загружаю данные…</section>
    <section v-else-if="!store.overview.value" class="rounded-xl border border-slate-200 bg-white p-8 text-center"><p class="text-slate-600">Для просмотра раздела войдите в админ-панель.</p><NuxtLink to="/admin/login" class="mt-4 inline-block rounded-lg bg-lime-300 px-4 py-2 font-medium">Войти</NuxtLink></section>
    <section v-else-if="section === 'requests'" class="overflow-x-auto rounded-xl border border-slate-200 bg-white p-4">
      <p v-if="!requests.length" class="py-8 text-center text-slate-500">Новых заявок нет.</p>
      <table v-else class="w-full min-w-[1050px] text-left text-sm"><thead><tr class="border-b text-slate-500"><th class="p-3">Дата</th><th class="p-3">Устройство</th><th class="p-3">Версия</th><th class="p-3">Имя клиента</th><th class="p-3">Направление</th><th class="p-3">Срок</th><th class="p-3">Действия</th></tr></thead><tbody><tr v-for="row in requests" :key="row.id" class="border-b last:border-0"><td class="p-3">{{ formatDate(row.requested_at) }}</td><td class="p-3 font-mono text-xs">{{ row.device_id }}</td><td class="p-3">{{ row.app_version }}</td><td class="p-3"><input v-model="requestDrafts[row.id].clientName" class="w-36 rounded-lg border border-slate-300 px-2 py-2" placeholder="Имя"></td><td class="p-3"><select v-model="requestDrafts[row.id].productId" class="rounded-lg border border-slate-300 p-2"><option value="tsekh">Цех</option><option value="shawarma">Шаурма</option></select></td><td class="p-3"><select v-model.number="requestDrafts[row.id].years" class="rounded-lg border border-slate-300 p-2"><option v-for="years in [1, 2, 3, 5, 10]" :key="years" :value="years">{{ years }} лет</option></select></td><td class="p-3"><div class="flex gap-2"><button class="rounded-lg bg-lime-300 px-3 py-2 font-medium" :disabled="busy" @click="decide(row, true)">Принять</button><button class="rounded-lg border border-red-200 px-3 py-2 text-red-700" :disabled="busy" @click="decide(row, false)">Отклонить</button></div></td></tr></tbody></table>
    </section>
    <section v-else-if="section === 'clients'" class="rounded-xl border border-slate-200 bg-white p-4">
      <input v-model="query" class="mb-4 w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2" placeholder="Поиск клиента или устройства">
      <div class="overflow-x-auto"><table class="w-full min-w-[1050px] text-left text-sm"><thead><tr class="border-b text-slate-500"><th class="p-3">Клиент</th><th class="p-3">Направление</th><th class="p-3">Устройство</th><th class="p-3">Лицензия до</th><th class="p-3">Статус</th><th class="p-3">Управление</th></tr></thead><tbody><tr v-for="row in clients" :key="row.id" class="border-b last:border-0"><td class="p-3 font-medium">{{ row.client_name }}</td><td class="p-3">{{ productNames[row.product_id] || row.product_id }}</td><td class="p-3 font-mono text-xs">{{ row.device_id }}</td><td class="p-3">{{ formatDate(row.expires_at) }}</td><td class="p-3">{{ row.status === 'active' ? 'Активна' : 'Отключена' }}</td><td class="p-3"><div class="flex flex-wrap gap-2"><button class="rounded-lg border px-3 py-2" @click="editName(row.id, row.client_name)">Имя</button><button class="rounded-lg border px-3 py-2" :disabled="busy" @click="issuePin(row.id)">Временный PIN</button><button class="rounded-lg border px-3 py-2" @click="editTerm(row.id, row.expires_at)">Срок</button><button class="rounded-lg border px-3 py-2" :class="row.status === 'active' ? 'border-red-200 text-red-700' : 'border-lime-300 text-lime-800'" :disabled="busy" @click="toggleLicense(row.id, row.status !== 'active')">{{ row.status === 'active' ? 'Отключить' : 'Включить' }}</button></div></td></tr><tr v-if="!clients.length"><td colspan="6" class="p-8 text-center text-slate-500">Клиенты не найдены.</td></tr></tbody></table></div>
    </section>
    <section v-else class="space-y-6">
      <form class="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 md:grid-cols-2" @submit.prevent="publish">
        <h2 class="text-lg font-semibold md:col-span-2">Опубликовать обновление</h2>
        <label class="text-sm">Направление<select v-model="upload.productId" class="mt-1 block w-full rounded-lg border border-slate-300 p-2"><option value="tsekh">Цех</option><option value="shawarma">Шаурма</option></select></label>
        <label class="text-sm">Версия<input v-model="upload.version" required pattern="\d+\.\d+\.\d+" placeholder="1.2.3" class="mt-1 block w-full rounded-lg border border-slate-300 p-2"></label>
        <label class="text-sm md:col-span-2">Описание<textarea v-model="upload.notes" maxlength="2000" class="mt-1 block w-full rounded-lg border border-slate-300 p-2" rows="3" /></label>
        <label class="text-sm md:col-span-2">Файл обновления<input required type="file" class="mt-1 block w-full rounded-lg border border-slate-300 p-2" @change="upload.file = ($event.target as HTMLInputElement).files?.[0] || null"></label>
        <label class="flex items-center gap-2 text-sm md:col-span-2"><input v-model="upload.allClients" type="checkbox"> Доступно всем активным клиентам этого направления</label>
        <label v-if="!upload.allClients" class="text-sm md:col-span-2">Клиенты<select v-model="upload.licenseIds" multiple required class="mt-1 block min-h-32 w-full rounded-lg border border-slate-300 p-2"><option v-for="client in eligibleLicenses" :key="client.id" :value="client.id">{{ client.client_name }} · {{ client.device_id.slice(0, 12) }}</option></select></label>
        <button class="w-fit rounded-lg bg-lime-300 px-4 py-2 font-semibold" :disabled="busy">Опубликовать</button>
      </form>
      <section class="overflow-x-auto rounded-xl border border-slate-200 bg-white p-5"><h2 class="mb-4 text-lg font-semibold">Опубликованные версии</h2><table class="w-full min-w-[750px] text-left text-sm"><thead><tr class="border-b text-slate-500"><th class="p-3">Направление</th><th class="p-3">Версия</th><th class="p-3">Файл</th><th class="p-3">Опубликована</th><th class="p-3">Статус</th><th class="p-3">Действие</th></tr></thead><tbody><tr v-for="row in releases" :key="`${row.product_id}-${row.version}`" class="border-b last:border-0"><td class="p-3">{{ productNames[row.product_id] || row.product_id }}</td><td class="p-3">{{ row.version }}</td><td class="p-3">{{ row.file_name }}</td><td class="p-3">{{ formatDate(row.published_at) }}</td><td class="p-3">{{ row.published ? 'Доступна' : 'Скрыта' }}</td><td class="p-3"><button class="rounded-lg border px-3 py-2" :disabled="busy" @click="perform(() => api.toggleRelease(row.product_id, row.version), 'Статус версии обновлён.')">{{ row.published ? 'Скрыть' : 'Опубликовать' }}</button></td></tr><tr v-if="!releases.length"><td colspan="6" class="p-6 text-center text-slate-500">Опубликованных версий пока нет.</td></tr></tbody></table></section>
    </section>
    <div v-if="tempPin" class="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" @click.self="tempPin = ''"><section role="dialog" aria-modal="true" class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"><h2 class="text-xl font-semibold">Временный PIN</h2><p class="mt-2 text-sm text-slate-600">Передайте код клиенту. Он действует один час и используется один раз.</p><p class="my-5 rounded-lg bg-lime-50 p-4 text-center font-mono text-3xl font-bold tracking-[0.3em]">{{ tempPin }}</p><p class="mb-4 text-xs text-slate-500">Истекает: {{ formatDate(tempPinExpiresAt) }}</p><button class="w-full rounded-lg border px-4 py-2" @click="tempPin = ''">Закрыть</button></section></div>
  </main>
</template>
