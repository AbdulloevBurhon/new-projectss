<script setup lang="ts">
import WorkshopTable from '~/features/tsekh/components/WorkshopTable.vue'
import WorkshopDialog from '~/features/tsekh/components/WorkshopDialog.vue'
import type { TechCard } from '../../types/inventory'
import { money, quantity } from '../../utils/format'

defineProps<{ card: TechCard }>()
defineEmits<{ close: [] }>()
</script>

<template>
  <WorkshopDialog wide class="techcard-dialog" :title="card.name" @close="$emit('close')">
    <div class="dialog-content techcard-grid">
      <div class="techcard-details">
        <div v-if="card.photo" class="techcard-photo"><img :src="card.photo" alt="Фото изделия" /></div>
        <dl class="detail-list">
          <div><dt>Цена продажи</dt><dd>{{ money(card.price) }}</dd></div>
          <div><dt>Цена производства</dt><dd>{{ money(card.cost) }}</dd></div>
        </dl>
      </div>
      <section class="techcard-materials" aria-label="Состав техкарты">
        <h3>Материалы <span class="inventory-tag">{{ card.materials?.length ?? 0 }}</span></h3>
        <div class="techcard-material-list">
          <WorkshopTable :rows="card.materials ?? []" v-slot="{ pageRows }">
            <thead><tr><th scope="col">Товар</th><th scope="col" class="numeric-cell">Штук</th><th scope="col" class="numeric-cell">Расход</th></tr></thead>
            <tbody>
              <tr v-for="item in pageRows" :key="item.productId">
                <td><strong>{{ item.name }}</strong></td>
                <td class="numeric-cell">{{ item.pieces === undefined ? '—' : quantity(item.pieces) }}</td>
                <td class="numeric-cell">{{ quantity(item.quantity) }} {{ item.unit }}</td>
              </tr>
              <tr v-if="!card.materials?.length"><td colspan="3" class="table-empty">В техкарте пока нет материалов.</td></tr>
            </tbody>
          </WorkshopTable>
        </div>
      </section>
    </div>
  </WorkshopDialog>
</template>

