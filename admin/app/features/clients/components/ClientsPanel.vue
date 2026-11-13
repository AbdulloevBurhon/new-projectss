<script setup lang="ts">
import { Check, Copy, Ellipsis, Info, KeyRound, MessageSquare, Pencil, Power, Search, Trash2 } from '@lucide/vue'
import { DataTable, AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Badge, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, Input, Label, Textarea, toast } from '@obshaya/ui'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { clients } from '../../admin-state'
import type { ClientItem } from '../../admin-state'
import { editClient, issueLoginPin, issueTemporaryPin, listClientVersionHistory, listClients, removeClient as removeClientApi } from '../../../../admin-endpoints/clients/clients.service'
import { deleteMessage as deleteMessageApi, listMessages, replyToClient } from '../../../../admin-endpoints/messages/messages.service'

const query = ref('')
const selected = ref<ClientItem | null>(null)
const editOpen = ref(false)
const infoOpen = ref(false)
const deleteOpen = ref(false)
const statusOpen = ref(false)
const pinOpen = ref(false)
const messagesOpen = ref(false)
const editName = ref('')
const editUntil = ref('')
const pinCode = ref('')
const pinExpiresAt = ref(0)
const currentTime = ref(Date.now())
const pinCopied = ref(false)
const pinKind = ref<'temporary' | 'login'>('temporary')
const reply = ref('')
type ChatMessage = { id: string; direction: 'incoming' | 'outgoing'; text: string; date: string; status: 'sent' | 'read' }
const conversations = ref<Record<string, ChatMessage[]>>({})
const messages = computed(() => selected.value ? conversations.value[selected.value.id] ?? [] : [])
const messageDeleteOpen = ref(false)
const messageToDelete = ref<string | null>(null)
const busy = ref(false)
const filtered = computed(() => clients.value.filter(row => `${row.client} ${row.direction} ${row.device}`.toLowerCase().includes(query.value.toLowerCase())))
const clientColumns = [{ key: 'number', label: '№' }, { key: 'client', label: 'Клиент' }, { key: 'direction', label: 'Направление' }, { key: 'device', label: 'Устройство' }, { key: 'version', label: 'Версия EXE' }, { key: 'licenseFrom', label: 'Лицензия с' }, { key: 'licenseUntil', label: 'Лицензия до' }, { key: 'status', label: 'Статус' }, { key: 'actions', label: 'Действия', align: 'right' as const }]
const historyColumns = [{ key: 'date', label: 'Дата' }, { key: 'from', label: 'Версия с' }, { key: 'to', label: 'Версия на' }]
const pinTimeLeft = computed(() => Math.max(0, pinExpiresAt.value - currentTime.value))
const pinTimeLabel = computed(() => `${String(Math.floor(pinTimeLeft.value / 60000)).padStart(2, '0')}:${String(Math.floor(pinTimeLeft.value % 60000 / 1000)).padStart(2, '0')}`)
let clock: ReturnType<typeof setInterval>
onMounted(() => { clock = setInterval(() => { currentTime.value = Date.now() }, 1000); void refreshClients() })
onUnmounted(() => clearInterval(clock))

async function refreshClients() {
  try { clients.value = await listClients() } catch (error) { toast.error(error instanceof Error ? error.message : 'Не удалось загрузить клиентов') }
}

function openEdit(row: ClientItem) { selected.value = row; editName.value = row.client; editUntil.value = row.licenseUntil; editOpen.value = true }
function openStatus(row: ClientItem) { selected.value = row; statusOpen.value = true }
async function openInfo(row: ClientItem) {
  selected.value = row; infoOpen.value = true
  try { row.versionHistory = await listClientVersionHistory(row.id) }
  catch (error) { toast.error(error instanceof Error ? error.message : 'Не удалось загрузить историю обновлений') }
}
async function changeStatus() {
  if (!selected.value) return
  const activating = !selected.value.active
  try { await editClient(selected.value.id, { status: activating ? 'active' : 'disabled' }); statusOpen.value = false; await refreshClients(); toast.success(activating ? 'Клиент включён' : 'Клиент отключён') }
  catch (error) { toast.error(error instanceof Error ? error.message : 'Не удалось изменить статус') }
}
async function openPin(row: ClientItem) {
  selected.value = row; pinOpen.value = true; pinKind.value = 'temporary'; pinCode.value = ''; pinCopied.value = false
  try { const result = await issueTemporaryPin(row.id); pinCode.value = result.pin; pinExpiresAt.value = Date.parse(result.expiresAt) }
  catch (error) { pinOpen.value = false; toast.error(error instanceof Error ? error.message : 'Не удалось выдать временный PIN') }
}
async function openLoginPin(row: ClientItem) {
  selected.value = row; pinOpen.value = true; pinKind.value = 'login'; pinCode.value = ''; pinCopied.value = false; pinExpiresAt.value = 0
  try { const result = await issueLoginPin(row.id); pinCode.value = result.pin; toast.success('PIN для входа создан') }
  catch (error) { pinOpen.value = false; toast.error(error instanceof Error ? error.message : 'Не удалось выдать PIN для входа') }
}
async function copyPin() {
  try { await navigator.clipboard.writeText(pinCode.value); pinCopied.value = true; toast.success('Временный PIN скопирован') }
  catch { toast.error('Не удалось скопировать PIN-код') }
}
async function openMessages(row: ClientItem) {
  selected.value = row; reply.value = ''; messageDeleteOpen.value = false; messagesOpen.value = true
  try { conversations.value[row.id] = await listMessages(row.id); await refreshClients() }
  catch (error) { toast.error(error instanceof Error ? error.message : 'Не удалось загрузить переписку') }
}
async function sendReply() {
  if (!reply.value.trim()) return toast.error('Введите текст сообщения')
  if (!selected.value || busy.value) return
  busy.value = true
  try { await replyToClient(selected.value.id, reply.value.trim()); reply.value = ''; conversations.value[selected.value.id] = await listMessages(selected.value.id); toast.success('Ответ отправлен') }
  catch (error) { toast.error(error instanceof Error ? error.message : 'Не удалось отправить ответ') }
  finally { busy.value = false }
}
function confirmMessageDelete(id: string) { messageToDelete.value = id; messageDeleteOpen.value = true }
async function deleteMessage() {
  if (!messageToDelete.value || !selected.value) return
  try { await deleteMessageApi(messageToDelete.value); conversations.value[selected.value.id] = await listMessages(selected.value.id); toast.success('Сообщение удалено') }
  catch (error) { toast.error(error instanceof Error ? error.message : 'Не удалось удалить сообщение') }
  finally { messageDeleteOpen.value = false }
}
async function saveEdit() {
  if (!selected.value || !editName.value.trim() || !editUntil.value) return toast.error('Заполните имя и срок лицензии')
  try { await editClient(selected.value.id, { clientName: editName.value.trim(), licenseUntil: new Date(editUntil.value).toISOString() }); editOpen.value = false; await refreshClients(); toast.success('Данные клиента обновлены') }
  catch (error) { toast.error(error instanceof Error ? error.message : 'Не удалось сохранить клиента') }
}
function formatDate(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-').reverse().join('.') : value }
async function removeClient() {
  if (!selected.value) return
  try { await removeClientApi(selected.value.id); deleteOpen.value = false; await refreshClients(); toast.success('Доступ клиента сброшен; данные сохранены') }
  catch (error) { toast.error(error instanceof Error ? error.message : 'Не удалось удалить клиента') }
}
</script>

<template>
  <section class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="client-search relative w-full"><Search class="client-search-icon size-4 text-muted-foreground" /><Input v-model="query" placeholder="Найти клиента" class="client-search-input" /></div>
      <Badge variant="secondary" class="rounded-full">{{ filtered.length }} клиентов</Badge>
    </div>
    <DataTable :columns="clientColumns" :rows="filtered" row-key="id" empty-text="Клиенты не найдены">
      <template #cell-number="{ index }"><span class="text-muted-foreground">{{ index + 1 }}</span></template>
      <template #cell-client="{ row }"><span class="font-medium">{{ row.client }}</span></template>
      <template #cell-device="{ value }"><span class="font-mono text-xs">{{ value }}</span></template>
      <template #cell-version="{ value }"><Badge variant="secondary" class="rounded-full">{{ value }}</Badge></template>
      <template #cell-licenseUntil="{ value }"><span class="whitespace-nowrap">{{ formatDate(value) }}</span></template>
      <template #cell-status="{ row }"><Badge v-if="row.active" class="rounded-full" style="background-color: #ecfdf3; color: #027a48">Активен</Badge><Badge v-else-if="row.expired" variant="secondary" class="rounded-full">Срок истёк</Badge><Badge v-else variant="destructive" class="rounded-full">Отключён</Badge></template>
      <template #cell-actions="{ row }"><div class="flex justify-end"><DropdownMenu>
        <DropdownMenuTrigger as-child><Button size="icon" variant="ghost" aria-label="Действия клиента"><Ellipsis class="size-4" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem @click="openInfo(row)"><Info class="mr-2 size-4 text-sky-600" />Подробнее</DropdownMenuItem>
          <DropdownMenuItem @click="openEdit(row)"><Pencil class="mr-2 size-4 text-amber-600" />Изменить имя и срок</DropdownMenuItem>
          <DropdownMenuItem @click="openStatus(row)"><Power class="mr-2 size-4 text-emerald-600" />{{ row.active ? 'Отключить' : 'Включить' }}</DropdownMenuItem>
          <DropdownMenuItem @click="openPin(row)"><KeyRound class="mr-2 size-4 text-violet-600" />Изменить PIN-код</DropdownMenuItem>
          <DropdownMenuItem @click="openLoginPin(row)"><KeyRound class="mr-2 size-4 text-emerald-600" />Выдать PIN для входа</DropdownMenuItem>
          <DropdownMenuItem @click="openMessages(row)"><MessageSquare class="mr-2 size-4 text-sky-600" />Сообщения</DropdownMenuItem>
          <DropdownMenuSeparator /><DropdownMenuItem class="text-destructive" @click="selected = row; deleteOpen = true"><Trash2 class="mr-2 size-4" />Удалить</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu></div></template>
    </DataTable>
    <Dialog v-model:open="editOpen"><DialogContent><DialogHeader><DialogTitle>Редактировать клиента</DialogTitle><DialogDescription>Измените имя и дату окончания лицензии.</DialogDescription></DialogHeader>
      <div class="space-y-4 py-2"><div class="space-y-2"><Label for="client-edit-name">Имя клиента</Label><Input id="client-edit-name" v-model="editName" /></div><div class="space-y-2"><Label for="client-edit-until">Лицензия до</Label><Input id="client-edit-until" v-model="editUntil" type="date" /></div></div>
      <DialogFooter><Button variant="outline" @click="editOpen = false">Отмена</Button><Button @click="saveEdit">Сохранить</Button></DialogFooter>
    </DialogContent></Dialog>
    <Dialog v-model:open="infoOpen"><DialogContent><DialogHeader><DialogTitle>{{ selected?.client }}</DialogTitle><DialogDescription>История переходов между версиями.</DialogDescription></DialogHeader>
      <div class="space-y-2"><h3 class="text-sm font-medium">История обновлений</h3><DataTable :columns="historyColumns" :rows="selected?.versionHistory ?? []" row-key="date" empty-text="Истории обновлений пока нет"><template #cell-date="{ value }"><span class="whitespace-nowrap">{{ value }}</span></template><template #cell-to="{ value }"><span class="font-medium">{{ value }}</span></template></DataTable></div>
      <DialogFooter><Button variant="outline" @click="infoOpen = false">Закрыть</Button></DialogFooter>
    </DialogContent></Dialog>
    <Dialog v-model:open="statusOpen"><DialogContent><DialogHeader><DialogTitle>{{ selected?.active ? 'Отключить клиента?' : 'Включить клиента?' }}</DialogTitle><DialogDescription>Изменить статус клиента «{{ selected?.client }}»?</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" @click="statusOpen = false">Отмена</Button><Button :variant="selected?.active ? 'destructive' : 'default'" @click="changeStatus">{{ selected?.active ? 'Отключить' : 'Включить' }}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog v-model:open="pinOpen"><DialogContent><DialogHeader><DialogTitle>{{ pinKind === 'login' ? 'PIN-код для входа' : 'Временный PIN-код' }}</DialogTitle><DialogDescription>Для клиента «{{ selected?.client }}». {{ pinKind === 'login' ? 'Код заменяет текущий PIN. Клиент увидит его на странице активации.' : 'Код действует один час.' }}</DialogDescription></DialogHeader><div class="space-y-3 py-2"><Label>PIN-код</Label><div class="flex items-center gap-2"><div class="flex h-12 flex-1 items-center rounded-md border bg-muted/50 px-4 font-mono text-xl font-semibold tracking-[0.3em]">{{ pinCode }}</div><Button variant="outline" size="icon" aria-label="Скопировать PIN-код" :disabled="!pinCode || (pinKind === 'temporary' && pinTimeLeft === 0)" @click="copyPin"><Check v-if="pinCopied" class="size-4 text-emerald-600" /><Copy v-else class="size-4" /></Button></div><p v-if="pinKind === 'login'" class="text-sm text-muted-foreground">PIN останется действующим, пока клиент не изменит его в настройках.</p><p v-else class="text-sm" :class="pinTimeLeft ? 'text-muted-foreground' : 'text-destructive'">{{ pinTimeLeft ? `Действует ещё ${pinTimeLabel}` : 'Срок действия PIN-кода истёк' }}</p></div><DialogFooter><Button @click="pinOpen = false">Готово</Button></DialogFooter></DialogContent></Dialog>
    <Dialog v-model:open="messagesOpen"><DialogContent><DialogHeader><DialogTitle>Сообщения клиента</DialogTitle><DialogDescription>{{ selected?.client }} · переписка с клиентом.</DialogDescription></DialogHeader><div class="max-h-64 space-y-3 overflow-y-auto rounded-lg border bg-muted/30 p-3 text-sm"><p v-if="!messages.length" class="py-8 text-center text-muted-foreground">Сообщений пока нет.</p><div v-for="message in messages" :key="message.id" class="flex max-w-[90%] items-start gap-2 rounded-lg p-3" :class="message.direction === 'outgoing' ? 'ml-auto bg-blue-50 text-blue-900' : 'mr-auto bg-background'"><div class="min-w-0 flex-1"><div class="mb-1 flex justify-between gap-3 text-xs text-muted-foreground"><span>{{ message.direction === 'outgoing' ? 'Администратор' : 'Клиент' }}</span><time>{{ message.date }}</time></div><p class="whitespace-pre-wrap break-words">{{ message.text }}</p></div><Button size="icon" variant="ghost" class="size-7 shrink-0 text-rose-600 hover:bg-rose-50" :aria-label="`Удалить сообщение от ${message.direction === 'outgoing' ? 'администратора' : 'клиента'}`" @click="confirmMessageDelete(message.id)"><Trash2 class="size-4" /></Button></div></div><Textarea v-model="reply" placeholder="Напишите ответ клиенту" /><DialogFooter><Button variant="outline" @click="messagesOpen = false">Закрыть</Button><Button @click="sendReply"><MessageSquare /> Ответить</Button></DialogFooter></DialogContent></Dialog>
    <AlertDialog v-model:open="messageDeleteOpen"><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Удалить сообщение?</AlertDialogTitle><AlertDialogDescription>Это сообщение будет удалено из переписки.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Отмена</AlertDialogCancel><AlertDialogAction class="bg-destructive text-destructive-foreground hover:bg-destructive/90" @click="deleteMessage">Удалить</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <AlertDialog v-model:open="deleteOpen"><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Удалить клиента?</AlertDialogTitle><AlertDialogDescription>Клиент «{{ selected?.client }}» будет удалён из списка.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Отмена</AlertDialogCancel><AlertDialogAction @click="removeClient">Удалить</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>
</template>

<style scoped>
.client-search-icon { position: absolute; left: 0.75rem; top: 50%; z-index: 1; transform: translateY(-50%); }
.client-search-input { padding-left: 2.5rem; }
@media (min-width: 640px) {
  .client-search { max-width: 24rem; }
}
</style>
