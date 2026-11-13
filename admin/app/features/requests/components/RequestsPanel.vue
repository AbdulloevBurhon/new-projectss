<script setup lang="ts">
import { Check, Copy, X } from '@lucide/vue'
import { DataTable, Badge, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, toast } from '@obshaya/ui'
import { clients, requests } from '../../admin-state'
import { listClients } from '../../../../admin-endpoints/clients/clients.service'
import { decideRequest, listRequests } from '../../../../admin-endpoints/requests/requests.service'
import { onMounted, ref } from 'vue'

const columns = [
  { key: 'number', label: '№' }, { key: 'client', label: 'Клиент' }, { key: 'direction', label: 'Направление' },
  { key: 'device', label: 'Устройство' }, { key: 'version', label: 'Версия EXE' }, { key: 'received', label: 'Получена' },
  { key: 'licenseUntil', label: 'Лицензия до' }, { key: 'status', label: 'Статус' }, { key: 'actions', label: 'Действия', align: 'right' as const },
]

const busyId = ref('')
const pinDialogOpen = ref(false)
const approvedPin = ref('')
onMounted(() => { void refresh() })

async function refresh() {
  try { requests.value = await listRequests() } catch (error) { toast.error(error instanceof Error ? error.message : 'Не удалось загрузить заявки') }
}

async function accept(item: (typeof requests.value)[number]) {
  if (busyId.value) return
  busyId.value = item.id
  try {
    const days = Math.max(1, Math.ceil((new Date(item.licenseUntil).getTime() - Date.now()) / 86400000))
    const result = await decideRequest(item.id, { action: 'approve', clientName: item.client, licenseDays: days })
    requests.value = requests.value.filter(row => row.id !== item.id); clients.value = await listClients()
    if (result.initialPin) {
      approvedPin.value = result.initialPin; pinDialogOpen.value = true
      toast.success('Заявка одобрена')
    } else toast.error('Заявка одобрена, но сервер не вернул PIN-код.')
  } catch (error) { toast.error(error instanceof Error ? error.message : 'Не удалось принять заявку') }
  finally { busyId.value = '' }
}
async function decline(id: string) {
  if (busyId.value) return
  busyId.value = id
  try { await decideRequest(id, { action: 'reject' }); requests.value = requests.value.filter(row => row.id !== id); toast.success('Заявка отклонена') }
  catch (error) { toast.error(error instanceof Error ? error.message : 'Не удалось отклонить заявку') }
  finally { busyId.value = '' }
}

async function copyApprovedPin() {
  try { await navigator.clipboard.writeText(approvedPin.value); toast.success('PIN-код скопирован') }
  catch { toast.error('Не удалось скопировать PIN-код') }
}
</script>

<template>
  <section class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-muted-foreground">Новые обращения клиентов</p>
      <Badge variant="secondary" class="rounded-full">Ожидают решения: {{ requests.length }}</Badge>
    </div>
    <DataTable :columns="columns" :rows="requests" row-key="id" empty-text="Заявок пока нет">
      <template #cell-number="{ index }"><span class="text-muted-foreground">{{ index + 1 }}</span></template>
      <template #cell-client="{ row }"><Input v-model="row.client" class="min-w-40 font-medium" aria-label="Имя клиента" /></template>
      <template #cell-device="{ value }"><span class="font-mono text-xs">{{ value }}</span></template>
      <template #cell-licenseUntil="{ row }"><Input v-model="row.licenseUntil" type="date" class="min-w-40" aria-label="Дата окончания лицензии" /></template>
      <template #cell-status><Badge class="rounded-full bg-amber-50 text-amber-700">Ожидает</Badge></template>
      <template #cell-actions="{ row }"><div class="flex justify-end gap-2"><Button size="icon" variant="outline" aria-label="Принять заявку" style="color: #15803d" @click="accept(row)"><Check class="size-4" /></Button><Button size="icon" variant="outline" aria-label="Отклонить заявку" style="color: #dc2626" @click="decline(row.id)"><X class="size-4" /></Button></div></template>
    </DataTable>
    <Dialog v-model:open="pinDialogOpen">
      <DialogContent class="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Заявка одобрена</DialogTitle>
          <DialogDescription>Передай клиенту PIN-код для входа. Сохрани его сейчас.</DialogDescription>
        </DialogHeader>
        <div class="rounded-xl border bg-muted/40 px-5 py-4 text-center font-mono text-3xl font-semibold tracking-[0.3em]">{{ approvedPin }}</div>
        <DialogFooter>
          <Button variant="outline" @click="copyApprovedPin"><Copy class="mr-2 size-4" />Скопировать PIN</Button>
          <Button @click="pinDialogOpen = false">Готово</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </section>
</template>
