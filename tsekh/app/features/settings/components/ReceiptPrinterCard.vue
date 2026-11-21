<script setup lang="ts">
import { Printer, RefreshCw } from '@lucide/vue'
import { Button, Card, Input } from '@obshaya/ui'
import { computed, onMounted, ref } from 'vue'
import { getPrinter, nativeReceiptPrinter, printerError, savePrinter, testPrinter, type PrinterSettings } from '../../../../endpoints/settings/printer/printer.service'
import { sampleReceiptTicket } from '../../sales/receiptTicket'
import { printBrowserTicket } from '../../sales/printReceipt'

const settings = ref<PrinterSettings>()
const printers = ref<string[]>([])
const desktop = ref(false)
const busy = ref(false)
const error = ref('')
const notice = ref('')
const preview = computed(() => settings.value ? sampleReceiptTicket(settings.value) : '')
const widths = [58, 80] as const
const selectClass = 'h-9 w-full min-w-0 rounded-md border bg-background px-3 text-sm'

async function run(action: () => Promise<void>) {
  if (busy.value) return
  busy.value = true
  error.value = notice.value = ''
  try { await action() }
  catch (cause) { error.value = printerError(cause) }
  finally { busy.value = false }
}
function load(initial = false) {
  return run(async () => {
    const response = await getPrinter()
    printers.value = response.printers
    if (initial) settings.value = response.settings
  })
}
function save() {
  return run(async () => {
    if (!settings.value) return
    settings.value = await savePrinter(settings.value)
    notice.value = 'Настройки принтера сохранены.'
  })
}
function test() {
  return run(async () => {
    if (!settings.value) return
    if (!desktop.value) { printBrowserTicket(preview.value, settings.value.width); return }
    await testPrinter(settings.value)
    notice.value = 'Пробный чек отправлен на принтер.'
  })
}
onMounted(() => { desktop.value = nativeReceiptPrinter(); void load(true) })
</script>

<template>
  <Card class="max-w-5xl gap-5 rounded-2xl p-5 sm:p-6" aria-labelledby="printer-title">
    <header class="flex items-center gap-3">
      <span class="grid size-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700"><Printer class="size-5" aria-hidden="true" /></span>
      <h2 id="printer-title" class="text-lg font-semibold">Чековый принтер</h2>
    </header>
    <form v-if="settings" class="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.75fr)]" @submit.prevent="save">
      <fieldset :disabled="busy" class="grid min-w-0 content-start gap-4">
        <label class="grid gap-1.5 text-sm font-medium">Название магазина на чеке
          <Input v-model="settings.storeName" maxlength="100" placeholder="Например, Магазин у дома" />
        </label>
        <label class="grid gap-1.5 text-sm font-medium">Название принтера
          <Input v-model="settings.printerName" maxlength="100" placeholder="Например, Касса № 1" />
        </label>
        <div class="grid gap-1.5 text-sm font-medium">
          <span id="receipt-paper-width">Ширина бумаги</span>
          <div class="flex gap-2" role="group" aria-labelledby="receipt-paper-width">
            <Button v-for="width in widths" :key="width" type="button" :variant="settings.width === width ? 'default' : 'outline'"
              :aria-pressed="settings.width === width" @click="settings.width = width">{{ width }} мм</Button>
          </div>
        </div>
        <template v-if="desktop">
          <label class="grid gap-1.5 text-sm font-medium">Подключение
            <select v-model="settings.connection" aria-label="Подключение" :class="selectClass">
              <option value="windows">USB / очередь Windows</option><option value="lan">LAN по IP</option>
            </select>
          </label>
          <div v-if="settings.connection === 'windows'" class="grid min-w-0 gap-1.5">
            <label for="receipt-printer-queue" class="text-sm font-medium">Принтер Windows</label>
            <div class="flex min-w-0 gap-2">
              <select id="receipt-printer-queue" v-model="settings.queue" :class="selectClass">
                <option value="">Выберите принтер</option>
                <option v-if="settings.queue && !printers.includes(settings.queue)" :value="settings.queue">{{ settings.queue }} · недоступен</option>
                <option v-for="printer in printers" :key="printer" :value="printer">{{ printer }}</option>
              </select>
              <Button type="button" variant="outline" size="icon" aria-label="Обновить список принтеров" @click="load()"><RefreshCw class="size-4" /></Button>
            </div>
          </div>
          <div v-else class="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
            <label class="grid gap-1.5 text-sm font-medium">IP-адрес принтера
              <Input v-model="settings.ip" maxlength="80" placeholder="192.168.1.100" required />
            </label>
            <label class="grid gap-1.5 text-sm font-medium">Порт
              <Input v-model.number="settings.port" type="number" min="1" max="65535" required />
            </label>
          </div>
        </template>
        <p v-else class="text-sm text-muted-foreground">USB и LAN настраиваются в «Цехе» для Windows.</p>
        <div class="flex flex-wrap gap-2">
          <Button type="submit">Сохранить</Button>
          <Button type="button" variant="outline" @click="test">{{ desktop ? 'Пробная печать' : 'Печать из браузера' }}</Button>
        </div>
      </fieldset>
      <div class="min-w-0 rounded-xl border bg-muted/60 p-3 sm:p-4">
        <h3 class="mb-3 text-sm font-medium">Предпросмотр чека · {{ settings.width }} мм</h3>
        <pre class="mx-auto max-w-full overflow-auto border border-dashed bg-white p-2 text-[9.5px] leading-relaxed text-slate-950 shadow-sm"
          :style="{ width: settings.width + 'mm' }">{{ preview }}</pre>
      </div>
    </form>
    <p v-if="busy && !settings" class="text-sm text-muted-foreground" role="status">Загружаем принтеры…</p>
    <p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>
    <p v-if="notice" class="text-sm text-emerald-700" role="status">{{ notice }}</p>
    <Button v-if="error && !settings" class="self-start" type="button" variant="outline" @click="load(true)">Повторить</Button>
  </Card>
</template>
