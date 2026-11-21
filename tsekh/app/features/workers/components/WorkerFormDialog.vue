<script setup lang="ts">
import { Eye, EyeOff } from '@lucide/vue'
import { getClientPin, isTemporaryPin } from '@obshaya/contracts/client-api'
import { syncOwnerPin } from '../../../../endpoints/workers/owner-pin'
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label } from '@obshaya/ui'
import { saveEmployee as persistEmployee, employeeError } from '../../../../endpoints/workers/service'
import type { Employee, EmployeeResourceSelection } from '../../../../endpoints/workers/types'
import WorkerResourceSelect from './WorkerResourceSelect.vue'
import { useEmployeeAccess } from '../composables/useEmployeeAccess'
const props = defineProps<{ selected?: Employee }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const { isOwner } = useEmployeeAccess()
const busy = ref(false)
const error = ref('')
const employeeName = ref(props.selected?.name ?? '')
const employeeRole = ref(props.selected?.role ?? '')
const employeePhone = ref(props.selected?.phone ?? '')
const employeePin = ref('')
const employeePinVisible = ref(false)
const kinds = ['warehouses', 'accounts'] as const
type Kind = typeof kinds[number]
const openResource = ref<Kind>()
type Option = { id: string; name: string }
const choices = reactive<Record<Kind, Option[]>>({ warehouses: [], accounts: [] })
const picked = reactive<Record<Kind, string[]>>({ warehouses: [], accounts: [] })
const initial: Record<Kind, string[]> = { warehouses: [], accounts: [] }
const resourceStatus = ref<'loading' | 'ready' | 'error'>('loading')
function setResourceOpen(kind: Kind, open: boolean) {
  if (open || openResource.value === kind) openResource.value = open ? kind : undefined
}
onMounted(async () => {
  if (!isOwner.value) return
  try {
    const [warehouses, accounts] = await Promise.all([
      $fetch<Option[]>('/api/warehouses'),
      $fetch<Option[]>('/api/accounts'),
    ])
    Object.assign(choices, { warehouses, accounts })
    for (const kind of kinds) {
      const saved = props.selected?.resources?.[kind]
      initial[kind] = (saved ?? (props.selected ? choices[kind].map(row => row.id) : []))
        .filter(id => choices[kind].some(row => row.id === id))
      picked[kind] = [...initial[kind]]
    }
    resourceStatus.value = 'ready'
  } catch { resourceStatus.value = 'error' }
})

async function saveEmployee() {
  if (busy.value || (isOwner.value && resourceStatus.value !== 'ready')) return
  busy.value = true
  error.value = ''
  try {
    const ownerPin = isOwner.value && !isTemporaryPin() ? getClientPin() : ''
    if (employeePin.value && ownerPin) {
      if (employeePin.value === ownerPin) { error.value = 'Этот ПИН-код используется администратором.'; return }
      await syncOwnerPin(ownerPin, 'initialize')
    }
    const resources: EmployeeResourceSelection = {}
    if (isOwner.value && resourceStatus.value === 'ready') {
      for (const kind of kinds) {
        if (props.selected?.resources?.[kind] == null || picked[kind].length !== initial[kind].length
          || picked[kind].some(id => !initial[kind].includes(id))) resources[kind] = picked[kind]
      }
    }
    await persistEmployee({
      name: employeeName.value, role: employeeRole.value, phone: employeePhone.value, pin: employeePin.value,
      ...(Object.keys(resources).length ? { resources } : {}),
    }, props.selected?.id)
    emit('saved')
  } catch (cause) { error.value = employeeError(cause, 'Не удалось сохранить сотрудника.') }
  finally { busy.value = false }
}
</script>

<template>
  <Dialog :open="true" @update:open="open => { if (!open && !busy) emit('close') }">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ selected ? 'Редактировать сотрудника' : 'Сотрудник' }}</DialogTitle>
        <DialogDescription>Укажите имя, роль и телефон сотрудника.</DialogDescription>
      </DialogHeader>
      <form class="space-y-4" @submit.prevent="saveEmployee">
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-2"><Label for="employee-name">Имя</Label><Input id="employee-name" v-model="employeeName" maxlength="100" required placeholder="Введите имя" /></div>
          <div class="space-y-2"><Label for="employee-role">Роль</Label><Input id="employee-role" v-model="employeeRole" maxlength="80" required placeholder="Например, повар" /></div>
          <div class="space-y-2"><Label for="employee-phone">Телефон</Label><Input id="employee-phone" v-model="employeePhone" type="tel" maxlength="32" required placeholder="Введите телефон" /></div>
          <div v-if="isOwner || !selected" class="space-y-2">
            <Label for="employee-pin">{{ selected ? 'Новый ПИН-код' : 'ПИН-код' }}</Label>
            <div class="relative">
              <Input id="employee-pin" v-model="employeePin" :type="employeePinVisible ? 'text' : 'password'" inputmode="numeric"
                autocomplete="new-password" maxlength="5" pattern="[0-9]{5}" :required="!selected" placeholder="5 цифр" class="pr-10"
                @input="employeePin = employeePin.replace(/\D/g, '').slice(0, 5)" />
              <Button type="button" variant="ghost" size="icon" class="absolute inset-y-0 right-0 text-muted-foreground"
                :aria-label="employeePinVisible ? 'Скрыть ПИН-код' : 'Показать ПИН-код'" aria-controls="employee-pin"
                @click="employeePinVisible = !employeePinVisible">
                <EyeOff v-if="employeePinVisible" class="size-4" aria-hidden="true" />
                <Eye v-else class="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
        <div v-if="isOwner && resourceStatus === 'ready'" class="grid items-start gap-3 sm:grid-cols-2">
          <WorkerResourceSelect v-for="kind in kinds" :key="kind" v-model="picked[kind]"
            :label="kind === 'warehouses' ? 'Склад' : 'Счёт'" :options="choices[kind]" :disabled="busy"
            :open="openResource === kind" @update:open="setResourceOpen(kind, $event)" />
        </div>
        <p v-else-if="isOwner" class="text-sm text-muted-foreground" role="status">
          {{ resourceStatus === 'loading' ? 'Загружаем склады и счета…' : 'Не удалось загрузить склады и счета. Откройте форму снова.' }}
        </p>
        <p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>
        <DialogFooter>
          <Button type="button" variant="outline" :disabled="busy" @click="emit('close')">Отмена</Button>
          <Button type="submit" :disabled="busy || (isOwner && resourceStatus !== 'ready') || !employeeName.trim() || !employeeRole.trim() || !employeePhone.trim() || (!selected && employeePin.length !== 5)">Сохранить</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
