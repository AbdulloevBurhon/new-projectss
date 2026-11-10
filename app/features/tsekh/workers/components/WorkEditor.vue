<script setup lang="ts">
import WorkshopDialog from '~/features/tsekh/components/WorkshopDialog.vue'
import { readInventory } from '~/features/tsekh/warehouse/services/inventory-storage'
import { localDate, quantity } from '~/features/tsekh/warehouse/utils/format'
import type { Inventory } from '~/features/tsekh/warehouse/types/inventory'
import { warehouseKind } from '~/features/tsekh/warehouse/utils/warehouse-kind'
import { useWorkers } from '../stores/useWorkers'
import type { WorkDraft, WorkRecord } from '../types/workers'
import { scaleWorkMaterials, workMaterials } from '../utils/material-usage'

const props = defineProps<{ workerId: string; record?: WorkRecord; deleting?: boolean }>()
const emit = defineEmits<{ close: [] }>()
const { saveRecord, deleteRecord } = useWorkers()
const busy = ref(false)
const error = ref('')
const inventory = shallowRef<Inventory>()
const cards = computed(() => inventory.value?.techcards ?? [])
const warehouses = computed(() => (inventory.value?.warehouses ?? []).filter(item => warehouseKind(item) === 'materials'))
const count = props.record?.quantity ?? 1
const draft = reactive<WorkDraft>({
  date: props.record?.date ?? localDate(new Date().toISOString()),
  techcardId: props.record?.techcardId ?? '',
  wage: props.record ? props.record.wageCents / count / 100 : '',
  warehouseId: props.record?.materialUsage?.warehouseId ?? '',
})
const missingCard = computed(() => props.record && !cards.value.some(card => card.id === props.record?.techcardId))
const materials = computed(() => {
  if (!inventory.value) return []
  const lines = workMaterials(cards.value.find(card => card.id === draft.techcardId), inventory.value, props.record, draft.techcardId)
  return draft.techcardId === props.record?.techcardId ? lines : scaleWorkMaterials(lines, count)
})
const title = computed(() => {
  if (props.deleting) return 'Удалить работу?'
  return props.record ? 'Изменить работу' : 'Добавить работу'
})

onMounted(() => {
  if (props.deleting) return
  try {
    inventory.value = readInventory()
    if (!draft.warehouseId && warehouses.value.length === 1) draft.warehouseId = warehouses.value[0]!.id
  } catch {
    error.value = 'Не удалось загрузить техкарты склада.'
  }
})

async function submit() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    if (props.deleting && props.record) await deleteRecord(props.workerId, props.record.id)
    else await saveRecord(props.workerId, props.record?.id, { ...draft })
    emit('close')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось сохранить работу.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <WorkshopDialog :title="title" :busy="busy" @close="$emit('close')">
    <form class="dialog-content" @submit.prevent="submit">
      <p v-if="deleting">
        Удалить работу «{{ record?.techcardName }}» и её начисление?
        <template v-if="record?.materialUsage">Материалы вернутся в остаток склада.</template>
        <template v-if="record?.payment">Сумма этой работы вернётся на счёт.</template>
      </p>
      <template v-else>
        <label class="inventory-field">
          Техкарта двери
          <select v-model="draft.techcardId" required autofocus :disabled="busy">
            <option value="" disabled>Выберите техкарту</option>
            <option v-if="missingCard" :value="record?.techcardId">{{ record?.techcardName }} (из истории)</option>
            <option v-for="card in cards" :key="card.id" :value="card.id">{{ card.name }}</option>
          </select>
        </label>
        <p v-if="!cards.length && !missingCard" class="inventory-muted">
          Сначала добавьте техкарту в <NuxtLink class="workers-link" to="/warehouse/techcards">разделе «Склад»</NuxtLink>.
        </p>
        <template v-if="materials.length">
          <label class="inventory-field">Склад для списания
            <select v-model="draft.warehouseId" required :disabled="busy">
              <option value="" disabled>Выберите склад</option>
              <option v-for="warehouse in warehouses" :key="warehouse.id" :value="warehouse.id">{{ warehouse.name }}</option>
            </select>
          </label>
          <p class="inventory-muted">Расход за эту работу: {{ materials.map(line => `${line.name} — ${quantity(line.quantity)} ${line.unit}`).join(', ') }}.</p>
        </template>
        <div class="form-grid">
          <label class="inventory-field">Дата работы<input v-model="draft.date" type="date" required :disabled="busy" /></label>
          <label class="inventory-field">Зарплата за штуку, сом<input v-model="draft.wage" type="number" min="0" max="1000000" step="0.01" required :disabled="busy" /></label>
        </div>
        <p v-if="count > 1" class="inventory-muted">Количество в записи · {{ quantity(count) }} шт</p>
      </template>
      <p v-if="error" class="inventory-message error" role="alert">{{ error }}</p>
      <div class="dialog-actions">
        <button type="button" class="inventory-button secondary" :autofocus="deleting" :disabled="busy" @click="$emit('close')">Отмена</button>
        <button type="submit" class="inventory-button" :class="deleting ? 'destructive' : 'primary'" :disabled="busy || (!deleting && !cards.length && !missingCard)">
          {{ deleting ? 'Удалить' : 'Сохранить' }}
        </button>
      </div>
    </form>
  </WorkshopDialog>
</template>
