<script setup lang="ts">
import type { License, ProductId } from '../types/admin.types'
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
const selectedClient = ref<License | null>(null)
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
      <div><p class="text-xs font-bold uppercase tracking-[0.18em] text-lime-700">Управление лицензиями</p><h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{{ titles[section] }}</h1><p class="mt-1 text-sm text-slate-500">Заявки, доступ клиентов и версии программ в одном месте.</p></div>
      <div class="flex gap-2"><button class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50" :disabled="busy" @click="store.refresh()">Обновить</button><button class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50" @click="store.logout(); navigateTo('/admin/login')">Выйти</button></div>
    </div>
    <nav class="mb-5 flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1"><NuxtLink v-for="item in [{ id: 'requests', label: 'Заявки' }, { id: 'clients', label: 'Клиенты' }, { id: 'messages', label: 'Сообщения' }, { id: 'updates', label: 'Обновления' }]" :key="item.id" :to="`/admin/${item.id}`" class="rounded-lg px-4 py-2 text-sm font-semibold transition" :class="section === item.id ? 'bg-white text-slate-950 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'">{{ item.label }}<span v-if="item.id === 'requests' && requests.length" class="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs">{{ requests.length }}</span></NuxtLink></nav>
    <p v-if="error || storeError" role="alert" class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{{ error || storeError }}</p>
    <p v-if="notice" role="status" class="mb-4 rounded-lg bg-lime-50 p-3 text-sm text-lime-800">{{ notice }}</p>
    <section v-if="!store.overview.value && isLoading" class="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">Загружаю данные…</section>
    <section v-else-if="!store.overview.value" class="rounded-xl border border-slate-200 bg-white p-8 text-center"><p class="text-slate-600">Для просмотра раздела войдите в админ-панель.</p><NuxtLink to="/admin/login" class="mt-4 inline-block rounded-lg bg-lime-300 px-4 py-2 font-medium">Войти</NuxtLink></section>
    <section v-else-if="section === 'requests'" class="overflow-x-auto rounded-xl border border-slate-200 bg-white p-4">
      <p v-if="!requests.length" class="py-8 text-center text-slate-500">Новых заявок нет.</p>
      <table v-else class="w-full min-w-[1050px] text-left text-sm"><thead><tr class="border-b text-slate-500"><th class="p-3">Дата</th><th class="p-3">Устройство</th><th class="p-3">Версия</th><th class="p-3">Имя клиента</th><th class="p-3">Направление</th><th class="p-3">Срок</th><th class="p-3">Действия</th></tr></thead><tbody><tr v-for="row in requests" :key="row.id" class="border-b last:border-0"><td class="p-3">{{ formatDate(row.requested_at) }}</td><td class="p-3 font-mono text-xs">{{ row.device_id }}</td><td class="p-3">{{ row.app_version }}</td><td class="p-3"><input v-model="requestDrafts[row.id].clientName" class="w-36 rounded-lg border border-slate-300 px-2 py-2" placeholder="Имя"></td><td class="p-3"><select v-model="requestDrafts[row.id].productId" class="rounded-lg border border-slate-300 p-2"><option value="tsekh">Цех</option><option value="shawarma">Шаурма</option></select></td><td class="p-3"><select v-model.number="requestDrafts[row.id].years" class="rounded-lg border border-slate-300 p-2"><option v-for="years in [1, 2, 3, 5, 10]" :key="years" :value="years">{{ years }} лет</option></select></td><td class="p-3"><div class="flex gap-2"><button class="rounded-lg bg-lime-300 px-3 py-2 font-medium" :disabled="busy" @click="decide(row, true)">Принять</button><button class="rounded-lg border border-red-200 px-3 py-2 text-red-700" :disabled="busy" @click="decide(row, false)">Отклонить</button></div></td></tr></tbody></table>
    </section>
    <section v-else-if="section === 'clients'" class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
        <div><h2 class="text-lg font-semibold text-slate-900">Список клиентов</h2><p class="mt-1 text-sm text-slate-500">Лицензии, направление и связь с клиентами.</p></div>
        <label class="relative block w-full sm:max-w-sm"><span class="sr-only">Поиск клиента или устройства</span><svg viewBox="0 0 24 24" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg><input v-model="query" class="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-lime-500 focus:ring-2 focus:ring-lime-100" placeholder="Поиск клиента или устройства"></label>
      </div>
      <div class="overflow-x-auto"><table class="w-full min-w-[1180px] text-left text-sm"><thead class="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500"><tr class="border-b border-slate-200"><th class="px-4 py-3">№</th><th class="px-4 py-3">Клиент</th><th class="px-4 py-3">Направление</th><th class="px-4 py-3">Устройство</th><th class="px-4 py-3">Активирован</th><th class="px-4 py-3">Лицензия до</th><th class="px-4 py-3">Статус</th><th class="px-4 py-3">Управление</th></tr></thead><tbody class="divide-y divide-slate-100">
        <tr v-for="(row, index) in clients" :key="row.id" class="transition hover:bg-slate-50/80">
          <td class="px-4 py-4 text-slate-500">{{ index + 1 }}</td>
          <td class="px-4 py-4 font-semibold text-slate-900">{{ row.client_name }}</td>
          <td class="px-4 py-4"><span class="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{{ productNames[row.product_id] || row.product_id }}</span></td>
          <td class="max-w-52 truncate px-4 py-4 font-mono text-xs text-slate-500" :title="row.device_id">{{ row.device_id }}</td>
          <td class="whitespace-nowrap px-4 py-4 text-slate-600">{{ formatDate(row.activated_at) }}</td>
          <td class="whitespace-nowrap px-4 py-4 text-slate-600">{{ formatDate(row.expires_at) }}</td>
          <td class="px-4 py-4"><span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" :class="row.status === 'active' && row.expires_at > Date.now() / 1000 ? 'bg-emerald-50 text-emerald-700' : row.status === 'active' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'">{{ row.status !== 'active' ? 'Отключён' : row.expires_at <= Date.now() / 1000 ? 'Истекла' : 'Активен' }}</span></td>
          <td class="px-4 py-3"><div class="flex items-center gap-1.5">
            <button type="button" class="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50" title="Изменить имя" aria-label="Изменить имя клиента" @click="editName(row.id, row.client_name)">Имя</button>
            <button type="button" class="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50" title="Выдать временный PIN" aria-label="Выдать временный PIN" :disabled="busy" @click="issuePin(row.id)">PIN</button>
            <button type="button" class="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50" title="Изменить срок лицензии" aria-label="Изменить срок лицензии" @click="editTerm(row.id, row.expires_at)">Срок</button>
            <button type="button" class="rounded-lg border px-2.5 py-2 text-xs font-semibold transition" :class="row.status === 'active' ? 'border-red-200 bg-white text-red-700 hover:bg-red-50' : 'border-lime-300 bg-lime-50 text-lime-800 hover:bg-lime-100'" :disabled="busy" :title="row.status === 'active' ? 'Отключить клиента' : 'Включить клиента'" @click="toggleLicense(row.id, row.status !== 'active')">{{ row.status === 'active' ? 'Отключить' : 'Включить' }}</button>
            <button type="button" class="relative grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-lime-400 hover:bg-lime-50 hover:text-lime-800 focus:outline-none focus:ring-2 focus:ring-lime-200" :aria-label="`Сообщения ${row.client_name}, непрочитано: ${row.feedback_count || 0}`" :title="`Сообщения клиента · непрочитано: ${row.feedback_count || 0}`" @click="selectedClient = row">
              <svg viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 5.75A2.75 2.75 0 0 1 7.75 3h8.5A2.75 2.75 0 0 1 19 5.75v7.5A2.75 2.75 0 0 1 16.25 16H10l-5 4v-6.5z"/><path d="M8 8h8M8 11.5h5"/></svg>
              <span class="absolute -right-1.5 -top-1.5 grid min-h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-white bg-red-600 px-1 text-[10px] font-bold leading-none text-white">{{ row.feedback_count || 0 }}</span>
            </button>
          </div></td>
        </tr>
        <tr v-if="!clients.length"><td colspan="8" class="px-4 py-12 text-center text-sm text-slate-500">Клиенты не найдены.</td></tr>
      </tbody></table></div>
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
    <ClientMessagesDialog v-if="selectedClient" :license="selectedClient" @close="selectedClient = null" @changed="store.refresh().catch(() => {})" />
  </main>
</template>
