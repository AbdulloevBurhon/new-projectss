<script setup lang="ts">
import { KeyRound, Info, Pencil, Plus, Trash2, UsersRound } from '@lucide/vue'
import { computed, ref } from 'vue'
import { Button, DataTable, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label, Tabs, TabsContent, TabsList, TabsTrigger } from '@obshaya/ui'

const activeTab = ref('employees')
const search = ref('')
const employeeDialogOpen = ref(false)
const employeeName = ref('')
const employeeRole = ref('')
const employeePhone = ref('')
const employeePin = ref('')
const employees = ref<{ id: string; name: string; role: string; phone: string; pin: string }[]>([])
const visibleEmployees = computed(() => employees.value.filter(employee =>
  `${employee.name} ${employee.role} ${employee.phone}`.toLocaleLowerCase('ru').includes(search.value.trim().toLocaleLowerCase('ru')),
))
const columns = [
  { key: 'name', label: 'Имя', class: 'w-[30%]' },
  { key: 'role', label: 'Роль', class: 'w-[25%]' },
  { key: 'phone', label: 'Телефон', class: 'w-[25%]' },
  { key: 'actions', label: 'Действия', align: 'right' as const, class: 'w-[20%]' },
]

function openEmployeeDialog() {
  employeeName.value = ''
  employeeRole.value = ''
  employeePhone.value = ''
  employeePin.value = ''
  employeeDialogOpen.value = true
}

function saveEmployee() {
  const name = employeeName.value.trim()
  const role = employeeRole.value.trim()
  const phone = employeePhone.value.trim()
  const pin = employeePin.value
  if (!name || !role || !phone || !/^\d{5}$/.test(pin)) return
  employees.value.unshift({ id: crypto.randomUUID(), name, role, phone, pin })
  employeeDialogOpen.value = false
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
          <Button class="ml-auto" @click="openEmployeeDialog"><Plus class="size-4" />Сотрудник</Button>
        </div>
        <DataTable :columns="columns" :rows="visibleEmployees" empty-text="Сотрудников пока нет">
          <template #cell-actions="{ row }">
            <div class="flex justify-end gap-1">
              <Button size="icon" variant="ghost" :aria-label="`Информация о сотруднике ${row.name}`"><Info class="size-4 text-sky-600" /></Button>
              <Button size="icon" variant="ghost" :aria-label="`Ключ доступа сотрудника ${row.name}`"><KeyRound class="size-4 text-amber-600" /></Button>
              <Button size="icon" variant="ghost" :aria-label="`Редактировать сотрудника ${row.name}`"><Pencil class="size-4 text-blue-600" /></Button>
              <Button size="icon" variant="ghost" :aria-label="`Удалить сотрудника ${row.name}`"><Trash2 class="size-4 text-destructive" /></Button>
            </div>
          </template>
        </DataTable>
      </TabsContent>
    </Tabs>
    <Dialog v-model:open="employeeDialogOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Сотрудник</DialogTitle>
          <DialogDescription>Укажите имя, роль и телефон сотрудника.</DialogDescription>
        </DialogHeader>
        <form class="space-y-4" @submit.prevent="saveEmployee">
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2"><Label for="employee-name">Имя</Label><Input id="employee-name" v-model="employeeName" maxlength="120" required placeholder="Введите имя" /></div>
            <div class="space-y-2"><Label for="employee-role">Роль</Label><Input id="employee-role" v-model="employeeRole" maxlength="80" required placeholder="Например, повар" /></div>
            <div class="space-y-2"><Label for="employee-phone">Телефон</Label><Input id="employee-phone" v-model="employeePhone" type="tel" maxlength="32" required placeholder="Введите телефон" /></div>
            <div class="space-y-2"><Label for="employee-pin">ПИН-код</Label><Input id="employee-pin" v-model="employeePin" type="password" inputmode="numeric" autocomplete="new-password" maxlength="5" pattern="[0-9]{5}" required placeholder="5 цифр" @input="employeePin = employeePin.replace(/\D/g, '').slice(0, 5)" /></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" @click="employeeDialogOpen = false">Отмена</Button>
            <Button type="submit" :disabled="!employeeName.trim() || !employeeRole.trim() || !employeePhone.trim() || employeePin.length !== 5">Сохранить</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </section>
</template>
