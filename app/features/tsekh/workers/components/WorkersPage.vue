<script setup lang="ts">
import WorkshopTable from '~/features/tsekh/components/WorkshopTable.vue'
import WorkshopHeader from '~/features/tsekh/components/WorkshopHeader.vue'
import WorkshopIcon from '~/features/tsekh/components/WorkshopIcon.vue'
import WorkerEditor from './WorkerEditor.vue'
import WorkerDetails from './WorkerDetails.vue'
import WorkEntryDialog from './WorkEntryDialog.vue'
import { matchesName, money } from '~/features/tsekh/warehouse/utils/format'
import { workersStorageKey } from '../services/workers-storage'
import { useWorkers } from '../stores/useWorkers'
import { totalWages } from '../utils/records'
import { totalWorkQuantity } from '../utils/work-amount'

const { workers, ready, storageError, load } = useWorkers()
const search = ref('')
const selectedId = ref<string>()
const mode = ref<'create' | 'edit' | 'delete' | 'details' | 'work'>()
const selected = computed(() => workers.value.find(item => item.id === selectedId.value))
const visible = computed(() => workers.value.filter(item => matchesName(item.name, search.value)))

function open(action: NonNullable<typeof mode.value>, id?: string) {
  selectedId.value = id
  mode.value = action
}

function sync(event: StorageEvent) {
  if (event.key === null || event.key === workersStorageKey) load()
}

onMounted(() => {
  load()
  window.addEventListener('storage', sync)
})
onBeforeUnmount(() => window.removeEventListener('storage', sync))
</script>

<template>
  <WorkshopHeader section="Управление цехом" title="Рабочие" description="Список сотрудников, выполненные работы и начисления." icon="workers">
    <p v-if="storageError" class="inventory-message error" role="alert">{{ storageError }}</p>
    <p v-else-if="!ready" class="inventory-muted" role="status">Загрузка списка рабочих…</p>
    <section v-else class="inventory-panel">
      <div class="panel-filters">
        <label class="inventory-search">
          <WorkshopIcon name="search" />
          <input v-model="search" type="search" aria-label="Поиск по имени" placeholder="Поиск по имени" />
        </label>
        <div class="workers-toolbar-actions">
          <button type="button" class="inventory-button secondary" @click="open('work')">
            <WorkshopIcon name="techcards" /> Работа
          </button>
          <button type="button" class="inventory-button primary" @click="open('create')">
            <WorkshopIcon name="plus" /> Добавить рабочего
          </button>
        </div>
      </div>
      <WorkshopTable :rows="visible" :reset-key="search" table-class="workers-table" v-slot="{ pageRows }">
        <thead>
          <tr><th scope="col">Имя</th><th scope="col" class="numeric-cell">Сделано</th><th scope="col" class="numeric-cell">Зарплата</th><th scope="col" class="table-actions">Действия</th></tr>
        </thead>
        <tbody>
          <tr v-for="worker in pageRows" :key="worker.id">
            <td>
              <button type="button" class="table-item worker-name" @click="open('details', worker.id)">
                <span class="table-icon"><WorkshopIcon name="workers" /></span><strong>{{ worker.name }}</strong>
              </button>
            </td>
            <td class="numeric-cell"><span class="inventory-tag">{{ totalWorkQuantity(worker.records) }}</span></td>
            <td class="numeric-cell"><strong>{{ money(totalWages(worker.records)) }}</strong></td>
            <td class="table-actions">
              <div class="inventory-actions">
                <button type="button" class="icon-button" :aria-label="`Инфо: ${worker.name}`" title="Инфо" @click="open('details', worker.id)"><WorkshopIcon name="info" /></button>
                <button type="button" class="icon-button" :aria-label="`Изменить: ${worker.name}`" title="Изменить" @click="open('edit', worker.id)"><WorkshopIcon name="edit" /></button>
                <button type="button" class="icon-button danger" :aria-label="`Удалить: ${worker.name}`" title="Удалить" @click="open('delete', worker.id)"><WorkshopIcon name="trash" /></button>
              </div>
            </td>
          </tr>
          <tr v-if="!visible.length"><td colspan="4" class="table-empty">{{ search.trim() ? 'Совпадений не найдено' : 'Добавьте первого рабочего' }}</td></tr>
        </tbody>
      </WorkshopTable>
    </section>
    <WorkEntryDialog v-if="mode === 'work'" :workers="workers" @close="mode = undefined" />
    <WorkerDetails v-if="mode === 'details' && selected" :worker="selected" @close="mode = undefined" />
    <WorkerEditor
      v-if="mode === 'create' || (selected && (mode === 'edit' || mode === 'delete'))"
      :worker="selected" :deleting="mode === 'delete'" @close="mode = undefined"
    />
  </WorkshopHeader>
</template>

<style src="../assets/workers.css"></style>
