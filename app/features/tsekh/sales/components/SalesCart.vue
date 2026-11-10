<script setup lang="ts">
import WorkshopIcon from '~/features/tsekh/components/WorkshopIcon.vue'
import { money } from '~/features/tsekh/warehouse/utils/format'
import type { CartLine } from '../types/sales'

defineProps<{ lines: CartLine[]; total: number; canPay: boolean; hasAccounts: boolean }>()
defineEmits<{ adjust: [id: string, delta: number]; pay: [] }>()
</script>

<template>
  <section class="inventory-panel sales-cart" aria-label="Корзина">
    <div class="panel-heading"><div><h2>Корзина</h2><p>Позиций: {{ lines.length }}</p></div></div>
    <div class="sales-cart-items">
      <p v-if="!lines.length" class="sales-empty">Добавьте изделие из каталога.</p>
      <article v-for="{ item, quantity } in lines" :key="item.id" class="sales-cart-row">
        <div class="sales-thumb">
          <img v-if="item.photo" :src="item.photo" alt="" />
          <WorkshopIcon v-else name="products" />
        </div>
        <div class="sales-cart-detail">
          <strong>{{ item.name }}</strong>
          <small class="table-secondary">{{ item.warehouseName }}</small>
          <div class="sales-cart-controls">
            <button type="button" class="icon-button" :aria-label="`Уменьшить: ${item.name}`" @click="$emit('adjust', item.id, -1)"><WorkshopIcon name="minus" /></button>
            <span>{{ quantity }}</span>
            <button type="button" class="icon-button" :aria-label="`Увеличить: ${item.name}`" :disabled="quantity >= item.available" @click="$emit('adjust', item.id, 1)"><WorkshopIcon name="plus" /></button>
            <strong>{{ money(item.unitCents * quantity / 100) }}</strong>
          </div>
          <small v-if="quantity > item.available" class="sales-stock-warning">Доступно {{ item.available }} шт</small>
        </div>
      </article>
    </div>
    <p v-if="!hasAccounts" class="sales-account-note">Для оплаты <NuxtLink to="/tsekh/accounts">добавьте счёт</NuxtLink>.</p>
    <div class="sales-cart-footer">
      <div><span>Итого</span><strong>{{ money(total / 100) }}</strong></div>
      <button type="button" class="inventory-button primary" :disabled="!canPay" @click="$emit('pay')">Оплата</button>
    </div>
  </section>
</template>
