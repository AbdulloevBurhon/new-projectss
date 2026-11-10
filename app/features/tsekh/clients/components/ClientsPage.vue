<script setup lang="ts">
import WorkshopHeader from '~/features/tsekh/components/WorkshopHeader.vue'
import WorkshopIcon from '~/features/tsekh/components/WorkshopIcon.vue'
import WorkshopTable from '~/features/tsekh/components/WorkshopTable.vue'
import { useAccounts } from '~/features/tsekh/accounts/stores/useAccounts'
import { removeSale } from '~/features/tsekh/sales/utils/sales'
import { money, quantity } from '~/features/tsekh/warehouse/utils/format'
import { useClients } from '../stores/useClients'
import { clientPurchases, matchesClient, purchaseTotals } from '../utils/purchases'
import ClientDetails from './ClientDetails.vue'
import ClientEditor from './ClientEditor.vue'

const { clients, ready, error, load, sync } = useClients()
const accounts = useAccounts()
const query = ref('')
const editor = ref<{ mode: 'add' | 'edit' | 'delete' | 'details'; clientId?: string }>()
const selected = computed(() => clients.value.find(client => client.id === editor.value?.clientId))
const purchasesAvailable = computed(() => accounts.ready.value && !accounts.error.value)
const purchases = computed(() => clientPurchases(accounts.ledger.value.movements))
const rows = computed(() => clients.value.filter(client => matchesClient(client, query.value)).map(client => ({
  client, ...purchaseTotals(purchases.value.get(client.id) ?? []),
})))

function syncStorage(event: StorageEvent) {
  sync(event)
  accounts.sync(event)
}

onMounted(() => {
  load()
  accounts.load()
  window.addEventListener('storage', syncStorage)
})
onBeforeUnmount(() => window.removeEventListener('storage', syncStorage))
</script>

<template>
  <WorkshopHeader section="Управление цехом" title="Клиенты" description="Контакты, покупки и задолженность клиентов." icon="clients">
    <p v-if="error" class="inventory-message error" role="alert">{{ error }}</p>
    <p v-else-if="!ready" class="inventory-muted" role="status">Загрузка клиентов…</p>
    <template v-else>
      <p v-if="accounts.error.value" class="inventory-message error" role="alert">Не удалось загрузить покупки клиентов.</p>
      <section class="inventory-panel" aria-label="Список клиентов">
        <div class="panel-filters">
          <label class="inventory-search">
            <WorkshopIcon name="search" />
            <input v-model="query" type="search" aria-label="Поиск клиентов" placeholder="Имя или телефон" />
          </label>
          <button type="button" class="inventory-button primary clients-add" @click="editor = { mode: 'add' }">
            <WorkshopIcon name="plus" /> Добавить клиента
          </button>
        </div>
        <WorkshopTable :rows="rows" :reset-key="query" v-slot="{ pageRows }">
          <thead>
            <tr>
              <th scope="col">Имя</th><th scope="col">Телефон</th><th scope="col" class="numeric-cell">Куплено дверей</th>
              <th scope="col" class="numeric-cell">Сумма</th><th scope="col" class="numeric-cell">Долг</th><th scope="col" class="table-actions">Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="{ client, doors, total, debt } in pageRows" :key="client.id">
              <td><button type="button" class="table-item client-name" @click="editor = { mode: 'details', clientId: client.id }">
                <span class="table-icon"><WorkshopIcon name="clients" /></span><strong>{{ client.name }}</strong>
              </button></td>
              <td>{{ client.phone }}</td>
              <td class="numeric-cell">{{ purchasesAvailable ? quantity(doors) : '—' }}</td>
              <td class="numeric-cell">{{ purchasesAvailable ? money(total / 100) : '—' }}</td>
              <td class="numeric-cell" :class="{ 'client-debt': purchasesAvailable && debt > 0 }">{{ purchasesAvailable ? money(debt / 100) : '—' }}</td>
              <td class="table-actions">
                <div class="inventory-actions">
                  <button type="button" class="icon-button" :aria-label="`Инфо: ${client.name}`" title="Инфо" @click="editor = { mode: 'details', clientId: client.id }"><WorkshopIcon name="info" /></button>
                  <button type="button" class="icon-button" :aria-label="`Изменить: ${client.name}`" title="Изменить" @click="editor = { mode: 'edit', clientId: client.id }"><WorkshopIcon name="edit" /></button>
                  <button type="button" class="icon-button danger" :aria-label="`Удалить: ${client.name}`" title="Удалить" @click="editor = { mode: 'delete', clientId: client.id }"><WorkshopIcon name="trash" /></button>
                </div>
              </td>
            </tr>
            <tr v-if="!rows.length"><td colspan="6" class="table-empty">{{ query.trim() ? 'Совпадений не найдено.' : 'Клиентов пока нет.' }}</td></tr>
          </tbody>
        </WorkshopTable>
      </section>
    </template>
    <ClientDetails v-if="editor?.mode === 'details' && selected" :client="selected" :purchases="purchases.get(selected.id) ?? []"
      :available="purchasesAvailable" :cancel="id => accounts.change(data => removeSale(data, id))" @close="editor = undefined" />
    <ClientEditor v-else-if="editor?.mode === 'add' || (selected && (editor?.mode === 'edit' || editor?.mode === 'delete'))"
      :client="selected" :deleting="editor.mode === 'delete'" @close="editor = undefined" />
  </WorkshopHeader>
</template>

<style src="../assets/clients.css"></style>
