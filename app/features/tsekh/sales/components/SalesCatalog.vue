<script setup lang="ts">
import WorkshopIcon from '~/features/tsekh/components/WorkshopIcon.vue'
import { matchesName, money } from '~/features/tsekh/warehouse/utils/format'
import type { CartLine, SaleItem } from '../types/sales'

const props = defineProps<{ products: SaleItem[]; cart: CartLine[] }>()
defineEmits<{ add: [item: SaleItem] }>()
const search = ref('')
const matches = computed(() => props.products.filter(item => matchesName(item.name, search.value)))
const selected = computed(() => new Map(props.cart.map(line => [line.item.id, line.quantity])))
</script>

<template>
  <section class="inventory-panel sales-catalog" aria-label="Каталог изделий">
    <div class="panel-heading"><div><h2>Изделия</h2><p>Наличие по складам</p></div></div>
    <div class="panel-filters">
      <label class="inventory-search">
        <WorkshopIcon name="search" />
        <input v-model="search" type="search" aria-label="Поиск изделия" placeholder="Поиск изделия" />
      </label>
    </div>
    <div class="sales-items">
      <article v-for="item in matches" :key="item.id" class="sales-product">
        <div class="sales-thumb">
          <img v-if="item.photo" :src="item.photo" alt="" />
          <WorkshopIcon v-else name="products" />
        </div>
        <div class="sales-product-details">
          <h3>{{ item.name }}</h3>
          <small class="table-secondary">{{ item.warehouseName }}</small>
          <span class="inventory-tag" :class="{ positive: item.available }">{{ item.available ? `В наличии: ${item.available} шт` : 'Нет в наличии' }}</span>
        </div>
        <div class="sales-product-action">
          <strong>{{ money(item.unitCents / 100) }}</strong>
          <button type="button" class="inventory-button secondary"
            :aria-label="`В корзину: ${item.name}, ${item.warehouseName}`" :disabled="item.available <= (selected.get(item.id) ?? 0)" @click="$emit('add', item)">
            <WorkshopIcon name="plus" /> В корзину
          </button>
        </div>
      </article>
      <p v-if="!matches.length" class="sales-empty">{{ search.trim() ? 'Совпадений не найдено.' : 'Готовых изделий пока нет.' }}</p>
    </div>
  </section>
</template>
