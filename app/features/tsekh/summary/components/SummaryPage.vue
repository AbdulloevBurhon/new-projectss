<script setup lang="ts">
import WorkshopHeader from '~/features/tsekh/components/WorkshopHeader.vue'
import WorkshopIcon from '~/features/tsekh/components/WorkshopIcon.vue'
import { money, quantity } from '~/features/tsekh/warehouse/utils/format'
import { useSummary } from '../composables/useSummary'

const { period, invalidPeriod, totals, error, reset } = useSummary()
const cards = computed(() => {
  const result = totals.value
  if (!result) return []
  return [
    { label: 'Изготовлено изделий', icon: 'products', value: `${quantity(result.produced)} шт` },
    { label: 'Начислено рабочим', icon: 'workers', value: money(result.wagesCents / 100) },
    { label: 'Выручка от продаж', icon: 'sales', value: money(result.salesCents / 100) },
    { label: 'Поступление материалов', icon: 'receipts', value: money(result.receiptsCents / 100) },
  ]
})
</script>

<template>
  <WorkshopHeader section="Управление цехом" title="Итоги" description="Выпуск, зарплата, продажи и поступления материалов за выбранный период." icon="balance">
    <template #action>
      <div class="summary-period" role="group" aria-label="Фильтр итогов по датам">
        <label class="inventory-field">С даты
          <input v-model="period.from" type="date" :max="period.to || undefined" />
        </label>
        <label class="inventory-field">По дату
          <input v-model="period.to" type="date" :min="period.from || undefined" />
        </label>
        <button v-if="period.from || period.to" type="button" class="inventory-button secondary" @click="reset">Сбросить</button>
      </div>
    </template>

    <p v-if="error" class="inventory-message error" role="alert">{{ error }}</p>
    <p v-else-if="invalidPeriod" class="inventory-message error" role="alert">Дата окончания должна быть не раньше даты начала.</p>
    <p v-else-if="!totals" class="inventory-muted" role="status">Загрузка итогов…</p>
    <template v-else>
      <p v-if="!period.from && !period.to" class="summary-caption">За всё время</p>
      <dl class="summary-grid" aria-live="polite">
        <div v-for="card in cards" :key="card.icon" class="summary-card">
          <dt>
            <span class="summary-icon" :data-color="card.icon"><WorkshopIcon :name="card.icon" /></span>
            {{ card.label }}
          </dt>
          <dd>{{ card.value }}</dd>
        </div>
      </dl>
    </template>
  </WorkshopHeader>
</template>
