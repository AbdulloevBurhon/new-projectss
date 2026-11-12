<script setup lang="ts">
import { Check, X } from '@lucide/vue'
import { Badge, Button, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, toast } from '@obshaya/ui'
import { computed, ref } from 'vue'
import { acceptRequest, declineRequest, requests } from '../../admin-state'
import TablePagination from '../../shared/components/TablePagination.vue'

const page = ref(1)
const pageSize = ref(10)
const visibleRequests = computed(() => requests.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))

function syncPage() { page.value = Math.min(page.value, Math.max(1, Math.ceil(requests.value.length / pageSize.value))) }

function accept(item: (typeof requests.value)[number]) {
  acceptRequest(item)
  syncPage()
  toast.success('Заявка принята и добавлена в клиенты')
}

function decline(id: number) {
  declineRequest(id)
  syncPage()
  toast.warning('Заявка отклонена')
}
</script>

<template>
  <section class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-muted-foreground">Новые обращения клиентов</p>
      <Badge variant="secondary" class="rounded-full">Ожидают решения: {{ requests.length }}</Badge>
    </div>
    <div class="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader><TableRow class="h-12"><TableHead>№</TableHead><TableHead>Клиент</TableHead><TableHead>Направление</TableHead><TableHead>Устройство</TableHead><TableHead>Версия EXE</TableHead><TableHead>Получена</TableHead><TableHead>Лицензия до</TableHead><TableHead>Статус</TableHead><TableHead class="text-right">Действия</TableHead></TableRow></TableHeader>
        <TableBody>
          <TableRow v-for="(item, index) in visibleRequests" :key="item.id" class="h-14">
            <TableCell class="text-muted-foreground">{{ (page - 1) * pageSize + index + 1 }}</TableCell><TableCell><Input v-model="item.client" class="min-w-40 font-medium" aria-label="Имя клиента" /></TableCell><TableCell>{{ item.direction }}</TableCell>
            <TableCell class="font-mono text-xs">{{ item.device }}</TableCell><TableCell class="font-medium">{{ item.version }}</TableCell><TableCell class="whitespace-nowrap">{{ item.received }}</TableCell>
            <TableCell><Input v-model="item.licenseUntil" type="date" class="min-w-40" aria-label="Дата окончания лицензии" /></TableCell>
            <TableCell><Badge class="rounded-full bg-amber-50 text-amber-700">Ожидает</Badge></TableCell>
            <TableCell><div class="flex justify-end gap-2"><Button size="icon" variant="outline" aria-label="Принять заявку" style="color: #15803d" @click="accept(item)"><Check class="size-4" /></Button><Button size="icon" variant="outline" aria-label="Отклонить заявку" style="color: #dc2626" @click="decline(item.id)"><X class="size-4" /></Button></div></TableCell>
          </TableRow>
          <TableRow v-if="!requests.length"><TableCell colspan="9" class="h-24 text-center text-muted-foreground">Заявок пока нет</TableCell></TableRow>
        </TableBody>
      </Table>
    </div>
    <TablePagination v-model:page="page" v-model:page-size="pageSize" :total="requests.length" />
  </section>
</template>
