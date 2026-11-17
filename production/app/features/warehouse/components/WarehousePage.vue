<script setup lang="ts">
import { Pencil, Plus, Trash2, Warehouse as WarehouseIcon } from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Button, DataTable, Tabs, TabsContent, TabsList, TabsTrigger, toast } from '@obshaya/ui'
import { warehousesKey } from '../../../../endpoints/warehouse/get-warehouses/get-warehouses.service'
import { useGetWarehousesStore } from '../../../../endpoints/warehouse/get-warehouses/get-warehouses.store'
import { warehouseTypeLabels, type Warehouse, type WarehouseDraft } from '../../../../endpoints/warehouse/get-warehouses/get-warehouses.types'
import { useCreateWarehouseStore } from '../../../../endpoints/warehouse/create-warehouse/create-warehouse.store'
import { useUpdateWarehouseStore } from '../../../../endpoints/warehouse/update-warehouse/update-warehouse.store'
import { useDeleteWarehouseStore } from '../../../../endpoints/warehouse/delete-warehouse/delete-warehouse.store'
import WarehouseFormDialog from './WarehouseFormDialog.vue'
import DeleteWarehouseDialog from './DeleteWarehouseDialog.vue'

const { state, load } = useGetWarehousesStore()
const create = useCreateWarehouseStore()
const update = useUpdateWarehouseStore()
const remove = useDeleteWarehouseStore()
const dialogOpen = ref(false)
const editing = ref<Warehouse | null>(null)
const deleting = ref<Warehouse | null>(null)
const deleteOpen = ref(false)
const formStore = computed(() => editing.value ? update : create)
const columns = [
  { key: 'number', label: '№', class: 'w-16' },
  { key: 'name', label: 'Название' },
  { key: 'type', label: 'Тип склада' },
  { key: 'actions', label: 'Действия', align: 'right' as const },
]

function typeLabel(type: Warehouse['type']) {
  return type ? warehouseTypeLabels[type] : '—'
}

function openForm(warehouse: Warehouse | null = null) {
  editing.value = warehouse
  formStore.value.error.value = ''
  dialogOpen.value = true
}

function openDelete(warehouse: Warehouse) {
  deleting.value = warehouse
  remove.error.value = ''
  deleteOpen.value = true
}

function handleStorage(event: StorageEvent) {
  if (event.key === warehousesKey || event.key === null) load()
}

async function save(draft: WarehouseDraft) {
  const warehouse = editing.value
  const saved = warehouse
    ? await update.execute({ id: warehouse.id, ...draft })
    : await create.execute(draft)
  if (!saved) return
  load()
  dialogOpen.value = false
  toast.success(warehouse ? 'Склад обновлён.' : 'Склад добавлен.')
}

async function confirmDelete() {
  if (!deleting.value || !await remove.execute({ id: deleting.value.id })) return
  load()
  deleteOpen.value = false
  toast.success('Склад удалён.')
}

onMounted(() => {
  load()
  window.addEventListener('storage', handleStorage)
})
onBeforeUnmount(() => window.removeEventListener('storage', handleStorage))
</script>

<template>
  <section class="w-full p-5 text-slate-900 sm:p-8" aria-labelledby="warehouses-title">
    <h1 id="warehouses-title" class="mt-2 text-3xl font-semibold tracking-tight">Склады</h1>
    <Tabs default-value="warehouses" class="mt-6 gap-5">
      <div class="flex flex-wrap items-center gap-2">
        <TabsList class="h-11 w-fit rounded-xl bg-muted p-1.5">
          <TabsTrigger value="warehouses" class="h-9 flex-none rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <WarehouseIcon class="size-4 text-blue-600" />
            Склады
          </TabsTrigger>
        </TabsList>
        <Button class="ml-auto" :disabled="state.loading || !!state.error" @click="openForm()">
          <Plus class="size-4" />
          Добавить склад
        </Button>
      </div>

      <TabsContent value="warehouses">
        <p v-if="state.loading" class="text-sm text-muted-foreground" role="status">Загрузка складов…</p>
        <p v-else-if="state.error" class="text-sm text-destructive" role="alert">{{ state.error }}</p>
        <DataTable v-else :columns="columns" :rows="state.rows" empty-text="Складов пока нет">
          <template #cell-number="{ index }">{{ index + 1 }}</template>
          <template #cell-type="{ row }">{{ typeLabel(row.type) }}</template>
          <template #cell-actions="{ row }">
            <Button size="icon" variant="ghost" :aria-label="`Редактировать склад «${row.name}»`" @click="openForm(row)">
              <Pencil class="size-4 text-blue-600" />
            </Button>
            <Button size="icon" variant="ghost" :aria-label="`Удалить склад «${row.name}»`" @click="openDelete(row)">
              <Trash2 class="size-4 text-destructive" />
            </Button>
          </template>
        </DataTable>
      </TabsContent>
    </Tabs>
    <WarehouseFormDialog v-model:open="dialogOpen" :warehouse="editing" :saving="formStore.pending.value" :error="formStore.error.value" @save="save" />
    <DeleteWarehouseDialog v-model:open="deleteOpen" :name="deleting?.name || ''" :pending="remove.pending.value" :error="remove.error.value" @confirm="confirmDelete" />
  </section>
</template>
