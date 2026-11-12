<script setup lang="ts">
import { Check, Copy, Ellipsis, Info, KeyRound, MessageSquare, Pencil, Power, Search, Trash2 } from '@lucide/vue'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Badge, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, Input, Label, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea, toast } from '@obshaya/ui'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { clients } from '../../admin-state'
import type { ClientItem } from '../../admin-state'
import TablePagination from '../../shared/components/TablePagination.vue'

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
const reply = ref('')
type ChatMessage = { id: number; direction: 'incoming' | 'outgoing'; text: string; date: string }
const conversations = ref<Record<number, ChatMessage[]>>({})
const messages = computed(() => selected.value ? conversations.value[selected.value.id] ?? [] : [])
const messageDeleteOpen = ref(false)
const messageToDelete = ref<number | null>(null)
let nextMessageId = 1
const page = ref(1)
const pageSize = ref(10)
const filtered = computed(() => clients.value.filter(row => `${row.client} ${row.direction} ${row.device}`.toLowerCase().includes(query.value.toLowerCase())))
const visibleClients = computed(() => filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))
const pinTimeLeft = computed(() => Math.max(0, pinExpiresAt.value - currentTime.value))
const pinTimeLabel = computed(() => `${String(Math.floor(pinTimeLeft.value / 60000)).padStart(2, '0')}:${String(Math.floor(pinTimeLeft.value % 60000 / 1000)).padStart(2, '0')}`)
watch(query, () => { page.value = 1 })
let clock: ReturnType<typeof setInterval>
onMounted(() => { clock = setInterval(() => { currentTime.value = Date.now() }, 1000) })
onUnmounted(() => clearInterval(clock))

function openEdit(row: ClientItem) { selected.value = row; editName.value = row.client; editUntil.value = row.licenseUntil; editOpen.value = true }
function openStatus(row: ClientItem) { selected.value = row; statusOpen.value = true }
function changeStatus() {
  if (selected.value) selected.value.active = !selected.value.active
  statusOpen.value = false; toast.success(selected.value?.active ? 'Клиент включён' : 'Клиент отключён')
}
function openPin(row: ClientItem) { selected.value = row; pinCode.value = String(Math.floor(100000 + Math.random() * 900000)); pinExpiresAt.value = Date.now() + 3600000; pinCopied.value = false; pinOpen.value = true }
async function copyPin() {
  try { await navigator.clipboard.writeText(pinCode.value); pinCopied.value = true; toast.success('Временный PIN скопирован') }
  catch { toast.error('Не удалось скопировать PIN-код') }
}
function openMessages(row: ClientItem) {
  selected.value = row; reply.value = ''; messageDeleteOpen.value = false
  conversations.value[row.id] ??= [{ id: nextMessageId++, direction: 'incoming', text: 'Здравствуйте! Подскажите срок действия лицензии.', date: '12.11.2026, 11:40' }]
  messagesOpen.value = true
}
function sendReply() {
  if (!reply.value.trim()) return toast.error('Введите текст сообщения')
  if (selected.value) conversations.value[selected.value.id]?.push({ id: nextMessageId++, direction: 'outgoing', text: reply.value.trim(), date: new Date().toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }) })
  reply.value = ''; toast.success('Демо-ответ добавлен в переписку')
}
function confirmMessageDelete(id: number) { messageToDelete.value = id; messageDeleteOpen.value = true }
function deleteMessage() {
  if (selected.value) conversations.value[selected.value.id] = messages.value.filter(message => message.id !== messageToDelete.value)
  messageDeleteOpen.value = false; toast.success('Сообщение удалено')
}
function saveEdit() {
  if (!selected.value || !editName.value.trim() || !editUntil.value) return toast.error('Заполните имя и срок лицензии')
  selected.value.client = editName.value.trim(); selected.value.licenseUntil = editUntil.value
  editOpen.value = false; toast.success('Данные клиента обновлены')
}
function formatDate(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-').reverse().join('.') : value }
function removeClient() {
  if (selected.value) clients.value = clients.value.filter(row => row.id !== selected.value?.id)
  page.value = Math.min(page.value, Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
  deleteOpen.value = false; toast.success('Клиент удалён')
}
</script>

<template>
  <section class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="client-search relative w-full"><Search class="client-search-icon size-4 text-muted-foreground" /><Input v-model="query" placeholder="Найти клиента" class="client-search-input" /></div>
      <Badge variant="secondary" class="rounded-full">{{ filtered.length }} клиентов</Badge>
    </div>
    <div class="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader><TableRow class="h-12"><TableHead>№</TableHead><TableHead>Клиент</TableHead><TableHead>Направление</TableHead><TableHead>Устройство</TableHead><TableHead>Версия EXE</TableHead><TableHead>Лицензия с</TableHead><TableHead>Лицензия до</TableHead><TableHead>Статус</TableHead><TableHead class="text-right">Действия</TableHead></TableRow></TableHeader>
        <TableBody>
          <TableRow v-for="(row, index) in visibleClients" :key="row.id" class="h-14">
            <TableCell class="text-muted-foreground">{{ (page - 1) * pageSize + index + 1 }}</TableCell><TableCell class="font-medium">{{ row.client }}</TableCell><TableCell>{{ row.direction }}</TableCell>
            <TableCell class="font-mono text-xs">{{ row.device }}</TableCell><TableCell><Badge variant="secondary" class="rounded-full">{{ row.version }}</Badge></TableCell><TableCell class="whitespace-nowrap">{{ row.licenseFrom }}</TableCell><TableCell class="whitespace-nowrap">{{ formatDate(row.licenseUntil) }}</TableCell>
            <TableCell><Badge v-if="row.active" class="rounded-full" style="background-color: #ecfdf3; color: #027a48">Активен</Badge><Badge v-else variant="destructive" class="rounded-full">Отключён</Badge></TableCell>
            <TableCell><div class="flex justify-end"><DropdownMenu>
              <DropdownMenuTrigger as-child><Button size="icon" variant="ghost" aria-label="Действия клиента"><Ellipsis class="size-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem @click="selected = row; infoOpen = true"><Info class="mr-2 size-4 text-sky-600" />Подробнее</DropdownMenuItem>
                <DropdownMenuItem @click="openEdit(row)"><Pencil class="mr-2 size-4 text-amber-600" />Изменить имя и срок</DropdownMenuItem>
                <DropdownMenuItem @click="openStatus(row)"><Power class="mr-2 size-4 text-emerald-600" />{{ row.active ? 'Отключить' : 'Включить' }}</DropdownMenuItem>
                <DropdownMenuItem @click="openPin(row)"><KeyRound class="mr-2 size-4 text-violet-600" />Изменить PIN-код</DropdownMenuItem>
                <DropdownMenuItem @click="openMessages(row)"><MessageSquare class="mr-2 size-4 text-sky-600" />Сообщения</DropdownMenuItem>
                <DropdownMenuSeparator /><DropdownMenuItem class="text-destructive" @click="selected = row; deleteOpen = true"><Trash2 class="mr-2 size-4" />Удалить</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu></div></TableCell>
          </TableRow>
          <TableRow v-if="!filtered.length"><TableCell colspan="9" class="h-24 text-center text-muted-foreground">Клиенты не найдены</TableCell></TableRow>
        </TableBody>
      </Table>
    </div>
    <TablePagination v-model:page="page" v-model:page-size="pageSize" :total="filtered.length" />

    <Dialog v-model:open="editOpen"><DialogContent><DialogHeader><DialogTitle>Редактировать клиента</DialogTitle><DialogDescription>Измените имя и дату окончания лицензии.</DialogDescription></DialogHeader>
      <div class="space-y-4 py-2"><div class="space-y-2"><Label for="client-edit-name">Имя клиента</Label><Input id="client-edit-name" v-model="editName" /></div><div class="space-y-2"><Label for="client-edit-until">Лицензия до</Label><Input id="client-edit-until" v-model="editUntil" type="date" /></div></div>
      <DialogFooter><Button variant="outline" @click="editOpen = false">Отмена</Button><Button @click="saveEdit">Сохранить</Button></DialogFooter>
    </DialogContent></Dialog>
    <Dialog v-model:open="infoOpen"><DialogContent><DialogHeader><DialogTitle>{{ selected?.client }}</DialogTitle><DialogDescription>История переходов между версиями.</DialogDescription></DialogHeader>
      <div class="space-y-2"><h3 class="text-sm font-medium">История обновлений</h3><div class="overflow-hidden rounded-lg border"><Table><TableHeader><TableRow><TableHead>Дата</TableHead><TableHead>Версия с</TableHead><TableHead>Версия на</TableHead></TableRow></TableHeader><TableBody><TableRow v-for="(change, index) in selected?.versionHistory ?? []" :key="`${change.date}-${index}`"><TableCell class="whitespace-nowrap">{{ change.date }}</TableCell><TableCell>{{ change.from }}</TableCell><TableCell class="font-medium">{{ change.to }}</TableCell></TableRow><TableRow v-if="!selected?.versionHistory.length"><TableCell colspan="3" class="h-16 text-center text-sm text-muted-foreground">Истории обновлений пока нет</TableCell></TableRow></TableBody></Table></div></div>
      <DialogFooter><Button variant="outline" @click="infoOpen = false">Закрыть</Button></DialogFooter>
    </DialogContent></Dialog>
    <Dialog v-model:open="statusOpen"><DialogContent><DialogHeader><DialogTitle>{{ selected?.active ? 'Отключить клиента?' : 'Включить клиента?' }}</DialogTitle><DialogDescription>Изменить статус клиента «{{ selected?.client }}»?</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" @click="statusOpen = false">Отмена</Button><Button :variant="selected?.active ? 'destructive' : 'default'" @click="changeStatus">{{ selected?.active ? 'Отключить' : 'Включить' }}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog v-model:open="pinOpen"><DialogContent><DialogHeader><DialogTitle>Временный PIN-код</DialogTitle><DialogDescription>Для клиента «{{ selected?.client }}». Код действует один час.</DialogDescription></DialogHeader><div class="space-y-3 py-2"><Label>PIN-код</Label><div class="flex items-center gap-2"><div class="flex h-12 flex-1 items-center rounded-md border bg-muted/50 px-4 font-mono text-xl font-semibold tracking-[0.3em]">{{ pinCode }}</div><Button variant="outline" size="icon" aria-label="Скопировать PIN-код" :disabled="pinTimeLeft === 0" @click="copyPin"><Check v-if="pinCopied" class="size-4 text-emerald-600" /><Copy v-else class="size-4" /></Button></div><p class="text-sm" :class="pinTimeLeft ? 'text-muted-foreground' : 'text-destructive'">{{ pinTimeLeft ? `Действует ещё ${pinTimeLabel}` : 'Срок действия PIN-кода истёк' }}</p><p class="text-xs text-muted-foreground">Демо-интерфейс: PIN не сохраняется на сервере и не отправляется по SMS.</p></div><DialogFooter><Button @click="pinOpen = false">Готово</Button></DialogFooter></DialogContent></Dialog>
    <Dialog v-model:open="messagesOpen"><DialogContent><DialogHeader><DialogTitle>Сообщения клиента</DialogTitle><DialogDescription>{{ selected?.client }} · демо-переписка, SMS не отправляются.</DialogDescription></DialogHeader><div class="max-h-64 space-y-3 overflow-y-auto rounded-lg border bg-muted/30 p-3 text-sm"><p v-if="!messages.length" class="py-8 text-center text-muted-foreground">Сообщений пока нет.</p><div v-for="message in messages" :key="message.id" class="flex max-w-[90%] items-start gap-2 rounded-lg p-3" :class="message.direction === 'outgoing' ? 'ml-auto bg-blue-50 text-blue-900' : 'mr-auto bg-background'"><div class="min-w-0 flex-1"><div class="mb-1 flex justify-between gap-3 text-xs text-muted-foreground"><span>{{ message.direction === 'outgoing' ? 'Администратор' : 'Клиент' }}</span><time>{{ message.date }}</time></div><p class="whitespace-pre-wrap break-words">{{ message.text }}</p></div><Button size="icon" variant="ghost" class="size-7 shrink-0 text-rose-600 hover:bg-rose-50" :aria-label="`Удалить сообщение от ${message.direction === 'outgoing' ? 'администратора' : 'клиента'}`" @click="confirmMessageDelete(message.id)"><Trash2 class="size-4" /></Button></div></div><Textarea v-model="reply" placeholder="Напишите ответ клиенту" /><DialogFooter><Button variant="outline" @click="messagesOpen = false">Закрыть</Button><Button @click="sendReply"><MessageSquare /> Ответить</Button></DialogFooter></DialogContent></Dialog>
    <AlertDialog v-model:open="messageDeleteOpen"><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Удалить сообщение?</AlertDialogTitle><AlertDialogDescription>Это сообщение будет удалено из демо-переписки.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Отмена</AlertDialogCancel><AlertDialogAction class="bg-destructive text-destructive-foreground hover:bg-destructive/90" @click="deleteMessage">Удалить</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
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
