<script setup lang="ts">
import { useEmployeeAccess } from '../../features/workers/composables/useEmployeeAccess'
import { computed, onMounted, ref } from 'vue'
import { customers, saveClient, deleteClient, type Client } from '../../../endpoints/sales/service'
import { Contact, Info, Pencil, Plus, Trash2, Wallet } from '@lucide/vue'
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Button, DataTable, Input, Tabs, TabsContent, TabsList, TabsTrigger } from '@obshaya/ui'
import ClientFormDialog from '../../features/clients/components/ClientFormDialog.vue'
import ClientDetailsDialog from '../../features/clients/components/ClientDetailsDialog.vue'
import ClientDebtPaymentDialog from '../../features/clients/components/ClientDebtPaymentDialog.vue'

type ClientDialog = 'form' | 'details' | 'payment' | 'delete'

const clients = ref<Client[]>([])
const error = ref('')
async function loadClients() {
  try { clients.value = await customers(); error.value = '' }
  catch { error.value = 'Не удалось загрузить клиентов.' }
}
onMounted(loadClients)
const search = ref('')
const visibleClients = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('ru')
  if (!query) return clients.value
  const digits = /^[+\d\s()-]+$/.test(query) ? query.replace(/\D/g, '') : ''
  return clients.value.filter(client => client.name.toLocaleLowerCase('ru').includes(query)
    || client.phone.includes(query) || (digits && client.phone.replace(/\D/g, '').includes(digits)))
})
const selected = ref<Client>()
const dialog = ref<ClientDialog | null>(null)
const columns = [
  { key: 'name', label: 'Имя' },
  { key: 'phone', label: 'Телефон' },
  { key: 'debt', label: 'Долг' },
  { key: 'actions', label: 'Действия', align: 'right' as const },
]
function openDialog(kind: ClientDialog, client?: Client) {
  selected.value = client
  dialog.value = kind
}
async function save(name:string,phone:string) {
  try { await saveClient(name,phone,selected.value?.id);clients.value=await customers();dialog.value=null;error.value='' }
  catch {error.value='Не удалось сохранить клиента.';dialog.value=null}
}
async function remove(){
  if (!selected.value) return
  try { await deleteClient(selected.value.id);clients.value=await customers();error.value='' }
  catch {error.value='Не удалось удалить клиента. Проверьте, есть ли продажи на его имя.'}
  dialog.value=null
}

async function paymentSaved() {
  dialog.value = null
  await loadClients()
}

const { can } = useEmployeeAccess()
</script>

<template>
  <section class="w-full p-5 text-slate-900 sm:p-8">
    <h1 class="mt-2 text-3xl font-semibold tracking-tight">Клиенты</h1>
    <Tabs default-value="clients" class="mt-6 gap-5">
      <TabsList class="h-auto w-fit rounded-xl bg-muted p-1.5">
        <TabsTrigger value="clients" class="h-9 gap-2 rounded-lg px-4"><Contact class="size-4 text-blue-600" />Клиенты</TabsTrigger>
      </TabsList>
      <TabsContent value="clients" class="space-y-4">
        <p v-if="error" class="text-destructive" role="alert">{{error}}</p>
        <div class="flex flex-wrap items-center gap-3">
          <Input v-model="search" class="max-w-xs" type="search" placeholder="Поиск по имени или телефону" aria-label="Поиск по имени или телефону" />
          <Button class="ml-auto" @click="openDialog('form')"><Plus class="size-4" />Клиент</Button>
        </div>
        <DataTable :columns="columns" :rows="visibleClients" :empty-text="search.trim() ? 'Совпадений не найдено' : 'Клиентов пока нет'">
          <template #cell-debt="{ row }"><span :class="{ 'text-destructive': row.debt > 0 }">{{ row.debt.toLocaleString('ru-RU') }} сом</span></template>
          <template #cell-actions="{ row }">
            <div class="flex justify-end gap-1">
              <Button size="icon" variant="ghost" :aria-label="'Информация о клиенте ' + row.name" @click="openDialog('details', row)"><Info class="size-4 text-sky-600" /></Button>
              <span v-if="can('clients.pay') && can('accounts')" class="inline-flex items-center"
                :title="row.debt > 0 ? 'Погасить долг' : 'У клиента нет долга'">
                <Button size="sm" variant="ghost" :disabled="row.debt <= 0"
                  :aria-label="'Погасить долг клиента ' + row.name" @click="openDialog('payment', row)">
                  <Wallet class="size-4 text-green-700" />
                  <span class="hidden sm:inline">Погасить долг</span>
                </Button>
              </span>
              <Button v-if="can('clients.edit')" size="icon" variant="ghost" :aria-label="'Редактировать клиента ' + row.name" @click="openDialog('form', row)"><Pencil class="size-4 text-blue-600" /></Button>
              <Button v-if="can('clients.delete')" size="icon" variant="ghost" :aria-label="'Удалить клиента ' + row.name" @click="openDialog('delete', row)"><Trash2 class="size-4 text-destructive" /></Button>
            </div>
          </template>
        </DataTable>
      </TabsContent>
    </Tabs>
    <ClientFormDialog v-if="dialog === 'form'" :client="selected" @save="save" @close="dialog = null" />
    <ClientDetailsDialog v-if="dialog === 'details' && selected" :client="selected" @close="dialog = null" />
    <ClientDebtPaymentDialog v-if="dialog === 'payment' && selected" :client="selected" @paid="paymentSaved" @close="dialog = null" />
    <AlertDialog :open="dialog === 'delete'" @update:open="open => { if (!open) dialog = null }">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Удалить клиента?</AlertDialogTitle>
          <AlertDialogDescription>Клиент «{{ selected?.name }}» будет удалён.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Отмена</AlertDialogCancel><Button variant="destructive" @click="remove">Удалить</Button></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>
</template>
