<script setup lang="ts">
import { KeyRound, Info, Pencil, Plus, Trash2, UsersRound } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { Button, DataTable, Input, Tabs, TabsContent, TabsList, TabsTrigger } from '@obshaya/ui'

import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@obshaya/ui'
import { employees as loadEmployees, deleteEmployee, employeeError } from '../../../endpoints/workers/service'
import type { Employee } from '../../../endpoints/workers/types'
import WorkerFormDialog from '../../features/workers/components/WorkerFormDialog.vue'
import WorkerRightsDialog from '../../features/workers/components/WorkerRightsDialog.vue'
import WorkerSalesDialog from '../../features/workers/components/WorkerSalesDialog.vue'
import { useEmployeeAccess } from '../../features/workers/composables/useEmployeeAccess'

const { isOwner, can } = useEmployeeAccess()
const selected = ref<Employee>()
const details = ref<Employee>()
const rights = ref<Employee>()
const deleting = ref<Employee>()
const busy = ref(false)
const error = ref('')
const listError = ref('')
const activeTab = ref('employees')
const search = ref('')
const employeeDialogOpen = ref(false)
const employees = ref<Employee[]>([])
const visibleEmployees = computed(() => employees.value.filter(employee =>
  `${employee.name} ${employee.role} ${employee.phone}`.toLocaleLowerCase('ru').includes(search.value.trim().toLocaleLowerCase('ru')),
))
const columns = [
  { key: 'name', label: 'Имя', class: 'w-[30%]' },
  { key: 'role', label: 'Роль', class: 'w-[25%]' },
  { key: 'phone', label: 'Телефон', class: 'w-[25%]' },
  { key: 'actions', label: 'Действия', align: 'right' as const, class: 'w-[20%]' },
]

async function refresh() {
  try { employees.value = await loadEmployees(); listError.value = '' }
  catch (cause) { listError.value = employeeError(cause, 'Не удалось загрузить сотрудников.') }
}
onMounted(refresh)

function openEmployeeDialog(worker?: Employee) {
  selected.value = worker
  employeeDialogOpen.value = true
}

function workerSaved() {
  employeeDialogOpen.value = false
  void refresh()
}

async function remove() {
  if (!deleting.value || busy.value) return
  busy.value = true
  error.value = ''
  try {
    await deleteEmployee(deleting.value.id)
    deleting.value = undefined
    await refresh()
  } catch (cause) { error.value = employeeError(cause, 'Не удалось удалить сотрудника.') }
  finally { busy.value = false }
}
</script>

<template>
  <section class="w-full p-5 text-slate-900 sm:p-8">
    <h1 class="mt-2 text-3xl font-semibold tracking-tight">Сотрудники</h1>
    <Tabs v-model:model-value="activeTab" class="mt-6 gap-5">
      <TabsList class="h-auto w-fit rounded-xl bg-muted p-1.5">
        <TabsTrigger value="employees" class="h-9 gap-2 rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
          <UsersRound class="size-4 text-blue-600" />Сотрудники
        </TabsTrigger>
      </TabsList>
      <TabsContent value="employees" class="space-y-4">
        <div class="flex flex-wrap items-center gap-3">
          <Input v-model="search" class="max-w-xs" type="search" placeholder="Поиск по сотрудникам" aria-label="Поиск по сотрудникам" />
          <Button class="ml-auto" @click="openEmployeeDialog()"><Plus class="size-4" />Сотрудник</Button>
        </div>
        <p v-if="listError" class="text-sm text-destructive" role="alert">{{ listError }}</p>
        <DataTable :columns="columns" :rows="visibleEmployees" :reset-key="search" empty-text="Сотрудников пока нет">
          <template #cell-actions="{ row }">
            <div class="flex justify-end gap-1">
              <Button @click="details = row" size="icon" variant="ghost" :aria-label="`Информация о сотруднике ${row.name}`"><Info class="size-4 text-sky-600" /></Button>
              <Button v-if="isOwner" @click="rights = row" size="icon" variant="ghost" :aria-label="`Ключ доступа сотрудника ${row.name}`"><KeyRound class="size-4 text-amber-600" /></Button>
              <Button v-if="can('workers.edit')" @click="openEmployeeDialog(row)" size="icon" variant="ghost" :aria-label="`Редактировать сотрудника ${row.name}`"><Pencil class="size-4 text-blue-600" /></Button>
              <Button v-if="can('workers.delete')" @click="deleting = row; error = ''" size="icon" variant="ghost" :aria-label="`Удалить сотрудника ${row.name}`"><Trash2 class="size-4 text-destructive" /></Button>
            </div>
          </template>
        </DataTable>
      </TabsContent>
    </Tabs>
    <WorkerSalesDialog v-if="details" :employee="details" @close="details = undefined" />
    <WorkerRightsDialog v-if="rights" :employee="rights" @close="rights = undefined" @saved="rights = undefined; refresh()" />
    <AlertDialog :open="!!deleting" @update:open="open => { if (!open && !busy) deleting = undefined }">
      <AlertDialogContent @escape-key-down="busy && $event.preventDefault()">
        <AlertDialogHeader><AlertDialogTitle>Удалить сотрудника?</AlertDialogTitle><AlertDialogDescription>Вход сотрудника «{{ deleting?.name }}» будет отключён. Проведённые продажи сохранятся.</AlertDialogDescription></AlertDialogHeader>
        <p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>
        <AlertDialogFooter><AlertDialogCancel :disabled="busy">Отмена</AlertDialogCancel><Button variant="destructive" :disabled="busy" @click="remove">Удалить</Button></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <WorkerFormDialog v-if="employeeDialogOpen" :selected="selected" @close="employeeDialogOpen = false" @saved="workerSaved" />
  </section>
</template>
