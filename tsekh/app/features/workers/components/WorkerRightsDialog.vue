<script setup lang="ts">
import { ChevronDown } from '@lucide/vue'
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@obshaya/ui'
import { clientPaymentRight, posRights, workerSections, type Right } from '../../../../endpoints/workers/permissions'
import { employeeError, saveEmployeeRights } from '../../../../endpoints/workers/service'
import type { Employee } from '../../../../endpoints/workers/types'

const props = defineProps<{ employee: Employee }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const selected = ref<Right[]>([...props.employee.permissions])
const busy = ref(false)
const error = ref('')
const sections = workerSections.map(section => ({
  ...section,
  children: section.id === 'sales' ? posRights : section.actions ? [
    { id: `${section.id}.edit`, label: 'Редактировать' },
    { id: `${section.id}.delete`, label: 'Удалять' },
    ...(section.id === 'clients' ? [clientPaymentRight] : []),
  ] : [],
}))

async function save() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    const permissions = selected.value.filter(right =>
      selected.value.includes(right.split('.')[0] as Right),
    )
    await saveEmployeeRights(props.employee.id, permissions)
    emit('saved')
  } catch (cause) {
    error.value = employeeError(cause, 'Не удалось сохранить права.')
  } finally { busy.value = false }
}
</script>

<template>
  <Dialog :open="true" @update:open="open => { if (!open && !busy) emit('close') }">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader><DialogTitle>Права доступа · {{ employee.name }}</DialogTitle><DialogDescription>Выберите доступные разделы и действия.</DialogDescription></DialogHeader>
      <form class="space-y-4" @submit.prevent="save">
        <fieldset :disabled="busy" class="divide-y rounded-lg border px-3">
          <div v-for="section in sections" :key="section.id" class="flex items-start gap-2 text-sm">
            <template v-if="section.children.length">
              <input v-model="selected" type="checkbox" :value="section.id" :aria-label="section.label" class="mt-3" />
              <details class="group min-w-0 flex-1">
                <summary class="flex cursor-pointer list-none items-center justify-between gap-2 py-2 font-medium [&::-webkit-details-marker]:hidden">
                  {{ section.label }}
                  <ChevronDown class="size-4 text-muted-foreground group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div class="flex flex-wrap gap-x-5 gap-y-2 border-l pb-2 pl-3">
                  <label v-for="child in section.children" :key="child.id" class="flex items-center gap-1.5">
                    <input v-model="selected" :disabled="!selected.includes(section.id)" type="checkbox"
                      :value="child.id" :aria-label="`${child.label} · ${section.label}`" />{{ child.label }}
                  </label>
                </div>
              </details>
            </template>
            <label v-else class="flex w-full items-center gap-2 py-2 font-medium">
              <input v-model="selected" type="checkbox" :value="section.id" />{{ section.label }}
            </label>
          </div>
        </fieldset>
        <p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>
        <DialogFooter><Button type="button" variant="outline" :disabled="busy" @click="emit('close')">Отмена</Button><Button type="submit" :disabled="busy">Сохранить</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
