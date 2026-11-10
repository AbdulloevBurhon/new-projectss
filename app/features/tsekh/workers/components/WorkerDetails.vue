<script setup lang="ts">
import WorkshopTable from '~/features/tsekh/components/WorkshopTable.vue'
import WorkshopDialog from '~/features/tsekh/components/WorkshopDialog.vue'
import WorkshopIcon from '~/features/tsekh/components/WorkshopIcon.vue'
import { money } from '~/features/tsekh/warehouse/utils/format'
import { newestOperationFirst, operationDateTime } from '~/features/tsekh/utils/operation-date'
import WorkEditor from './WorkEditor.vue'
import { totalWages } from '../utils/records'
import type { Worker, WorkRecord } from '../types/workers'
import { totalWorkQuantity } from '../utils/work-amount'

const props = defineProps<{ worker: Worker }>()
defineEmits<{ close: [] }>()
const from = ref('')
const to = ref('')
const editor = ref<{ mode: 'save' | 'delete'; record: WorkRecord }>()
const records = computed(() => props.worker.records
  .filter(item => (!from.value || item.date >= from.value) && (!to.value || item.date <= to.value))
  .sort(newestOperationFirst),
)

function open(mode: 'save' | 'delete', record: WorkRecord) {
  editor.value = { mode, record }
}

function reset() {
  from.value = ''
  to.value = ''
}
</script>

<template>
  <WorkshopDialog :title="worker.name" wide @close="$emit('close')">
    <div class="dialog-content">
      <div class="worker-summary">
        <span class="worker-avatar" aria-hidden="true">{{ worker.name.slice(0, 2).toLocaleUpperCase('ru') }}</span>
        <dl class="worker-totals">
          <div><dt>Сделано дверей</dt><dd>{{ totalWorkQuantity(records) }}</dd></div>
          <div><dt>Итоговая зарплата</dt><dd>{{ money(totalWages(records)) }}</dd></div>
        </dl>
      </div>
      <div class="worker-period" aria-label="Период выполненных работ" role="group">
        <label class="inventory-field">С даты<input v-model="from" type="date" :max="to || undefined" /></label>
        <label class="inventory-field">По дату<input v-model="to" type="date" :min="from || undefined" /></label>
        <button v-if="from || to" type="button" class="inventory-button secondary" @click="reset">Сбросить</button>
      </div>
      <div class="worker-records">
        <WorkshopTable :rows="records" :reset-key="JSON.stringify([worker.id, from, to])" v-slot="{ pageRows }">
          <thead>
            <tr><th scope="col">Дата и время</th><th scope="col">Дверь · техкарта</th><th scope="col" class="numeric-cell">Штук</th><th scope="col" class="numeric-cell">Зарплата</th><th scope="col" class="table-actions">Действия</th></tr>
          </thead>
          <tbody>
            <tr v-for="record in pageRows" :key="record.id">
              <td class="worker-date">{{ operationDateTime(record.date, record.createdAt) }}</td>
              <td><strong>{{ record.techcardName }}</strong></td>
              <td class="numeric-cell">{{ record.quantity ?? 1 }}</td>
              <td class="numeric-cell">{{ money(record.wageCents / 100) }}</td>
              <td class="table-actions">
                <div class="inventory-actions">
                  <button type="button" class="icon-button" :aria-label="`Изменить работу: ${record.techcardName}, ${operationDateTime(record.date, record.createdAt)}`" title="Изменить" @click="open('save', record)"><WorkshopIcon name="edit" /></button>
                  <button type="button" class="icon-button danger" :aria-label="`Удалить работу: ${record.techcardName}, ${operationDateTime(record.date, record.createdAt)}`" title="Удалить" @click="open('delete', record)"><WorkshopIcon name="trash" /></button>
                </div>
              </td>
            </tr>
            <tr v-if="!records.length"><td colspan="5" class="table-empty">{{ from || to ? 'За выбранный период работ нет' : 'Выполненных работ пока нет' }}</td></tr>
          </tbody>
        </WorkshopTable>
      </div>
    </div>
    <WorkEditor v-if="editor" :worker-id="worker.id" :record="editor.record" :deleting="editor.mode === 'delete'" @close="editor = undefined" />
  </WorkshopDialog>
</template>
