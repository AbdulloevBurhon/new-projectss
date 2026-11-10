<script setup lang="ts">
import WorkshopDialog from '~/features/tsekh/components/WorkshopDialog.vue'
import WorkshopIcon from '~/features/tsekh/components/WorkshopIcon.vue'
import WorkshopTable from '~/features/tsekh/components/WorkshopTable.vue'
import type { Inventory, TechCard } from '~/features/tsekh/warehouse/types/inventory'
import { money, quantity } from '~/features/tsekh/warehouse/utils/format'
import { receiptCostCents } from '~/features/tsekh/warehouse/utils/receipt-cost'
import { scaleWorkMaterials } from '../utils/material-usage'

const props = defineProps<{ card: TechCard; inventory: Inventory; warehouseId?: string; count: number }>()
defineEmits<{ close: [] }>()

const rows = computed(() => scaleWorkMaterials(props.card.materials ?? [], props.count).map(material => ({
  ...material,
  costCents: props.warehouseId ? receiptCostCents(props.inventory.receipts, props.warehouseId, material) : undefined,
})))
const hasCosts = computed(() => rows.value.some(item => item.costCents !== undefined))
const missingCosts = computed(() => rows.value.some(item => item.costCents === undefined))
const total = computed(() => rows.value.reduce((sum, item) => sum + (item.costCents ?? 0), 0) / 100)
</script>

<template>
  <WorkshopDialog title="Материалы техкарты" wide class="work-material-dialog" @close="$emit('close')">
    <div class="dialog-content">
      <div class="work-material-summary">
        <div class="work-entry-photo"><img v-if="card.photo" :src="card.photo" alt="" /><WorkshopIcon v-else name="products" /></div>
        <div>
          <h3>{{ card.name }}</h3>
          <p class="inventory-muted">На {{ quantity(count) }} шт</p>
          <p>{{ missingCosts && hasCosts ? 'Расход по известным ценам' : 'Расход на материалы' }} · <strong>{{ !rows.length || hasCosts ? money(total) : '—' }}</strong></p>
        </div>
      </div>
      <p v-if="rows.length" class="inventory-muted">
        {{ !warehouseId ? 'Выберите склад в форме работы, чтобы рассчитать стоимость.' : 'Стоимость рассчитана по средним ценам поступлений выбранного склада.' }}
      </p>
      <div class="work-material-list">
        <WorkshopTable :rows="rows" v-slot="{ pageRows }">
          <thead>
            <tr><th scope="col">Материал</th><th scope="col" class="numeric-cell">Штук</th><th scope="col" class="numeric-cell">Расход</th><th scope="col" class="numeric-cell">Стоимость</th></tr>
          </thead>
          <tbody>
            <tr v-for="item in pageRows" :key="item.productId">
              <td>{{ item.name }}</td>
              <td class="numeric-cell">{{ item.pieces === undefined ? '—' : quantity(item.pieces) }}</td>
              <td class="numeric-cell">{{ quantity(item.quantity) }} {{ item.unit }}</td>
              <td class="numeric-cell">{{ item.costCents === undefined ? '—' : money(item.costCents / 100) }}</td>
            </tr>
            <tr v-if="!rows.length"><td colspan="4" class="table-empty">В техкарте пока нет материалов.</td></tr>
          </tbody>
        </WorkshopTable>
      </div>
      <div class="dialog-actions">
        <button type="button" class="inventory-button primary" @click="$emit('close')">Понятно</button>
      </div>
    </div>
  </WorkshopDialog>
</template>
