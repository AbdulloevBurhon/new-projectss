<script setup lang="ts">
import { computed, ref } from 'vue'
import { Button,DataTable,Input,TabsContent,toast } from '@obshaya/ui'
import { Plus,Pencil,Trash2 } from '@lucide/vue'
import { warehouseTypeLabels, type Warehouse, type WarehouseDraft } from '../../../../../endpoints/warehouse/get-warehouses/get-warehouses.types'
import { useCreateWarehouseStore } from '../../../../../endpoints/warehouse/create-warehouse/create-warehouse.store'
import { useUpdateWarehouseStore } from '../../../../../endpoints/warehouse/update-warehouse/update-warehouse.store'
import { useDeleteWarehouseStore } from '../../../../../endpoints/warehouse/delete-warehouse/delete-warehouse.store'
import WarehouseFormDialog from './WarehouseFormDialog.vue'
import DeleteWarehouseDialog from './DeleteWarehouseDialog.vue'
import { useWarehouseContext } from '../../composables/warehouseContext'
const { state,load } = useWarehouseContext()
const create = useCreateWarehouseStore()
const update = useUpdateWarehouseStore()
const remove = useDeleteWarehouseStore()
const dialogOpen = ref(false)
const editing = ref<Warehouse | null>(null)
const deleting = ref<Warehouse | null>(null)
const deleteOpen = ref(false)
const warehouseSearch = ref('')
const visibleWarehouses = computed(() => state.rows.filter(warehouse => warehouse.name.toLocaleLowerCase('ru').includes(warehouseSearch.value.trim().toLocaleLowerCase('ru'))))
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
</script>

<template>
  <TabsContent value="warehouses" class="space-y-4">
    <div class="flex flex-wrap items-center gap-3">
      <Input v-model="warehouseSearch" class="max-w-xs" type="search" placeholder="Поиск по названию" aria-label="Поиск склада" />
      <Button class="ml-auto" :disabled="state.loading || !!state.error" @click="openForm()">
        <Plus class="size-4" />
        Склад
      </Button>
    </div>
    <p v-if="state.loading" class="text-sm text-muted-foreground" role="status">Загрузка складов…</p>
    <p v-else-if="state.error" class="text-sm text-destructive" role="alert">{{ state.error }}</p>
    <DataTable v-else :columns="columns" :rows="visibleWarehouses" :empty-text="warehouseSearch.trim() ? 'Совпадений не найдено' : 'Складов пока нет'">
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
    <WarehouseFormDialog v-model:open="dialogOpen" :warehouse="editing" :saving="formStore.pending.value" :error="formStore.error.value" @save="save" />
    <DeleteWarehouseDialog v-model:open="deleteOpen" :name="deleting?.name || ''" :pending="remove.pending.value" :error="remove.error.value" @confirm="confirmDelete" />
</template>
