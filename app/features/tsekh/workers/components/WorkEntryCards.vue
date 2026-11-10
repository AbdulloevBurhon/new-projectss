<script setup lang="ts">
import WorkshopIcon from '~/features/tsekh/components/WorkshopIcon.vue'
import type { TechCard } from '~/features/tsekh/warehouse/types/inventory'
import { matchesName, money } from '~/features/tsekh/warehouse/utils/format'
import type { WorkLineDraft } from '../types/workers'
import { maxWorkQuantity } from '../utils/work-amount'

const props = defineProps<{ cards: TechCard[]; disabled: boolean; ready: boolean }>()
defineEmits<{ materials: [card: TechCard] }>()
const lines = defineModel<WorkLineDraft[]>({ required: true })
const search = ref('')
const visibleCards = computed(() => {
  const selected = new Map(lines.value.map(line => [line.techcardId, line]))
  return props.cards.map(card => ({ card, line: selected.get(card.id) }))
    .filter(({ card, line }) => line || matchesName(card.name, search.value))
})

function toggle(card: TechCard, selected: boolean) {
  lines.value = selected
    ? lines.value.filter(line => line.techcardId !== card.id)
    : [...lines.value, { techcardId: card.id, quantity: 1, wage: card.cost }]
}

function update(id: string, field: 'quantity' | 'wage', event: Event) {
  const value = (event.target as HTMLInputElement).value
  lines.value = lines.value.map(line => line.techcardId === id ? { ...line, [field]: value } : line)
}
</script>

<template>
  <fieldset class="work-entry-fieldset" :disabled="disabled">
    <legend>Техкарты</legend>
    <label class="inventory-search work-entry-search">
      <WorkshopIcon name="search" />
      <input v-model="search" type="search" aria-label="Поиск техкарты" placeholder="Поиск техкарты" />
    </label>
    <div class="work-entry-cards">
      <article v-for="{ card, line } in visibleCards" :key="card.id" class="work-entry-card" :class="{ 'is-selected': line }">
        <div class="work-entry-photo"><img v-if="card.photo" :src="card.photo" alt="" /><WorkshopIcon v-else name="products" /></div>
        <div class="work-entry-card-body">
          <label class="work-entry-card-choice">
            <strong>{{ card.name }}</strong>
            <input type="checkbox" :checked="!!line" @change="toggle(card, !!line)" />
          </label>
          <p class="inventory-muted">Цена производства · {{ money(card.cost) }}</p>
          <button type="button" class="inventory-button secondary work-entry-info" :aria-label="`Материалы: ${card.name}`" @click="$emit('materials', card)">
            <WorkshopIcon name="info" /> Материалы
          </button>
          <div v-if="line" class="work-entry-line-fields">
            <label class="inventory-field">Штук
              <input :value="line.quantity" type="number" min="1" :max="maxWorkQuantity" step="1" required @input="update(card.id, 'quantity', $event)" />
            </label>
            <label class="inventory-field">Зарплата за штуку, сом
              <input :value="line.wage" type="number" min="0" max="1000000" step="0.01" required @input="update(card.id, 'wage', $event)" />
            </label>
          </div>
        </div>
      </article>
      <p v-if="ready && !visibleCards.length" class="inventory-muted">{{ cards.length ? 'Совпадений не найдено.' : 'Сначала добавьте техкарту на складе.' }}</p>
    </div>
  </fieldset>
</template>
