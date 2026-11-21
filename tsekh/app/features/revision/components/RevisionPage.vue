<script setup lang="ts">
import { ClipboardCheck, ListChecks, RefreshCw } from '@lucide/vue'
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from '@obshaya/ui'
import { computed, ref, watch } from 'vue'
import { useEmployeeAccess } from '../../workers/composables/useEmployeeAccess'
import { useRevision } from '../composables/useRevision'
import RevisionCount from './RevisionCount.vue'
import RevisionHistorySelect from './RevisionHistorySelect.vue'
import RevisionResult from './RevisionResult.vue'

const { can } = useEmployeeAccess()
const { warehouses, warehouse, selected, tab, snapshot, error, loading, saving, pending, draft,
  load, loadWarehouses, open, save, change } = useRevision()
const busy = computed(() => loading.value || saving.value || pending.value > 0)
const history = computed(() => snapshot.value.history.filter(row => row.status !== 'draft'))
const counted = computed(() => snapshot.value.rows.filter(row => row.actual != null && !row.stale).length)
const recount = ref(false)
watch(warehouse, () => { recount.value = false })
const selectStyle = 'h-9 w-full min-w-44 rounded-md border bg-background px-3 text-sm'
function requestRecount() {
  recount.value = true
  tab.value = 'count'
}
</script>

<template>
  <section class="w-full space-y-5 p-5 sm:p-8" aria-labelledby="revision-title">
    <h1 id="revision-title" class="mt-2 text-3xl font-semibold tracking-tight">Ревизия</h1>
    <div class="flex flex-wrap items-end gap-3">
      <div class="space-y-1.5 text-sm font-medium">
        <label for="revision-warehouse" class="block">Склад</label>
        <select id="revision-warehouse" v-model="warehouse" :class="selectStyle" :disabled="busy || !warehouses.length">
          <option v-if="!warehouses.length" value="">Нет доступных складов</option>
          <option v-for="entry in warehouses" :key="entry.id" :value="entry.id">{{ entry.name }}</option>
        </select>
      </div>
      <RevisionHistorySelect v-if="history.length" :history="history" :selected="selected" :disabled="busy" @select="open" />
      <Button variant="outline" :disabled="busy" @click="warehouse ? load() : loadWarehouses()">
        <RefreshCw class="size-4" />Обновить
      </Button>
      <p v-if="draft" class="py-2 text-sm tabular-nums text-muted-foreground sm:ml-auto" aria-live="polite">
        {{ pending ? 'Сохранение…' : `Посчитано ${counted} из ${snapshot.rows.length}` }}
      </p>
    </div>
    <p v-if="error" class="rounded-lg border border-destructive/30 bg-background p-3 text-sm text-destructive" role="alert">{{ error }}</p>
    <Tabs v-model:model-value="tab" class="gap-4">
      <TabsList class="h-auto w-fit rounded-xl bg-muted p-1.5">
        <TabsTrigger value="count" :disabled="!!selected" class="h-9 rounded-lg px-4"><ClipboardCheck class="size-4" />Ревизия</TabsTrigger>
        <TabsTrigger value="result" :disabled="loading" class="h-9 rounded-lg px-4"><ListChecks class="size-4" />Итог</TabsTrigger>
      </TabsList>
      <TabsContent value="count" class="space-y-4">
        <RevisionCount v-if="draft" :key="snapshot.header?.id" :rows="snapshot.rows" :show-stale="recount"
          :disabled="loading || saving" :save="save" @filter-changed="recount = false" />
        <div v-else-if="warehouse && !loading" class="space-y-3 rounded-xl border bg-background p-5">
          <h2 class="font-semibold">Подсчёт товаров</h2>
          <p class="text-sm text-muted-foreground">Начните ревизию выбранного склада, чтобы внести фактическое количество.</p>
          <Button :disabled="busy" @click="change('start')">Начать ревизию</Button>
        </div>
        <p v-else-if="!loading && !error" class="text-sm text-muted-foreground">Добавьте склад или попросите администратора открыть к нему доступ.</p>
      </TabsContent>
      <TabsContent value="result" class="space-y-4">
        <RevisionResult v-if="snapshot.header" :key="snapshot.header.id" :header="snapshot.header" :rows="snapshot.rows"
          :busy="busy" :can-post="can('warehouses.edit')" @recount="requestRecount" @change="change" />
        <p v-else-if="!loading" class="text-sm text-muted-foreground">Начните подсчёт или выберите проведённую ревизию в истории.</p>
      </TabsContent>
    </Tabs>
  </section>
</template>
