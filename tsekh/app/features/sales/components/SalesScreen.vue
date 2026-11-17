<script setup lang="ts">
import { toast } from '@obshaya/ui'
import SaleCart from './SaleCart.vue'
import SaleCatalog from './SaleCatalog.vue'
import SalesFilters from './SalesFilters.vue'
import { useSalesScreen } from '../composables/useSalesScreen'

const { search, warehouse, account, category, categories, products, cart, total, add, changeQuantity } = useSalesScreen()
const warehouses = ['Основной склад']
const accounts = ['Касса']

function paymentPlaceholder() {
  toast.info('Оплата подключится вместе с учётом и API.')
}

function clearCart() {
  cart.value = []
}
</script>

<template>
  <main class="min-h-[calc(100vh-2rem)] p-4 text-foreground sm:p-6">
    <header class="mb-5"><h1 class="text-2xl font-semibold tracking-tight">Продажа</h1></header>
    <div class="grid gap-4 xl:h-[calc(100vh-8rem)] xl:min-h-[430px] xl:grid-cols-[minmax(340px,0.82fr)_minmax(0,1.4fr)]">
      <SaleCart :items="cart" :total="total" @quantity="changeQuantity" @clear="clearCart" @pay="paymentPlaceholder" />
      <section class="flex min-h-[430px] flex-col gap-3 rounded-xl border bg-background p-3 xl:min-h-0">
        <SalesFilters v-model:search="search" v-model:warehouse="warehouse" v-model:account="account" v-model:category="category" :warehouses="warehouses" :accounts="accounts" :categories="categories" />
        <SaleCatalog :products="products" @add="add" />
      </section>
    </div>
  </main>
</template>
