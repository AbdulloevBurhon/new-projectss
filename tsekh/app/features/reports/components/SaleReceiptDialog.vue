<script setup lang="ts">
import { computed, ref } from 'vue'
import { Printer } from '@lucide/vue'
import {
  Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, toast,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@obshaya/ui'
import { cents, money, type Position, type Receipt } from '../../../../endpoints/sales/service'
import { nativeReceiptPrinter, printerError } from '../../../../endpoints/settings/printer/printer.service'
import { printReceipt } from '../../sales/printReceipt'

const props = defineProps<{ receipt: Receipt; lines: Position[] }>()
const emit = defineEmits<{ close: [] }>()
const number = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 9 })
const unitPrice = (price: number) => number.format(price) + ' сом'
const rows = computed(() => props.lines.map(line => {
  const catalogPrice = unitPrice(line.listPrice), salePrice = unitPrice(line.price)
  const changed = catalogPrice !== salePrice
  const lowered = changed && line.price < line.listPrice
  const discount = lowered ? Math.max(0, cents(line.qty * line.listPrice) - line.amount) : 0
  return { ...line, catalogPrice, salePrice, changed, lowered, discount }
}))
const lineDiscount = computed(() => rows.value.reduce((total, line) => total + line.discount, 0))
const debt = computed(() => props.receipt.total - props.receipt.paid)
const change = computed(() => props.receipt.tender - props.receipt.paid)
const printing = ref(false)

async function print() {
  if (printing.value) return
  printing.value = true
  try {
    await printReceipt(props.receipt.id)
    if (nativeReceiptPrinter()) toast.success('Чек отправлен на принтер.')
  } catch (error) { toast.error(printerError(error)) }
  finally { printing.value = false }
}
</script>

<template>
  <Dialog :open="true" @update:open="value => { if (!value) emit('close') }">
    <DialogContent class="flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] flex-col gap-5 overflow-y-auto rounded-2xl p-4 sm:max-w-4xl sm:p-6">
      <DialogHeader class="shrink-0 flex-row flex-wrap items-start justify-between pr-8 text-left">
        <div class="space-y-1.5">
          <DialogTitle class="text-xl font-semibold tracking-tight sm:text-2xl">Чек продажи</DialogTitle>
          <DialogDescription>{{ new Date(receipt.date).toLocaleString('ru-RU') }}</DialogDescription>
        </div>
        <Button type="button" variant="outline" :disabled="printing" @click="print">
          <Printer class="size-4" aria-hidden="true" />{{ printing ? 'Отправляем…' : 'Печать чека' }}
        </Button>
      </DialogHeader>

      <dl class="grid shrink-0 grid-cols-2 gap-x-4 gap-y-3 rounded-xl border bg-muted/45 px-3 py-3 text-sm sm:grid-cols-4 sm:px-4">
        <div class="min-w-0"><dt class="text-xs text-muted-foreground">Склад</dt><dd class="mt-0.5 break-words font-medium">{{ receipt.warehouseName }}</dd></div>
        <div class="min-w-0"><dt class="text-xs text-muted-foreground">Счёт</dt><dd class="mt-0.5 break-words font-medium">{{ receipt.accountName }}</dd></div>
        <div class="min-w-0"><dt class="text-xs text-muted-foreground">Сотрудник</dt><dd class="mt-0.5 break-words font-medium">{{ receipt.seller }} · {{ receipt.role }}</dd></div>
        <div v-if="receipt.clientName" class="min-w-0"><dt class="text-xs text-muted-foreground">Клиент</dt><dd class="mt-0.5 break-words font-medium">{{ receipt.clientName }}</dd></div>
      </dl>

      <div role="region" aria-label="Список позиций чека" tabindex="0"
        class="min-w-0 overflow-auto rounded-xl border bg-card outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset [&>[data-slot=table-container]]:contents"
        :class="rows.length > 1 ? 'min-h-24' : 'min-h-0'">
        <Table class="tabular-nums">
          <caption class="sr-only">Позиции чека</caption>
          <TableHeader class="sticky top-0 z-10 bg-muted">
            <TableRow>
              <TableHead scope="col" class="px-3">Товар</TableHead>
              <TableHead scope="col" class="text-right">Кол-во</TableHead>
              <TableHead scope="col" class="hidden text-right md:table-cell">По каталогу</TableHead>
              <TableHead scope="col" class="hidden text-right md:table-cell">Цена продажи</TableHead>
              <TableHead scope="col" class="hidden text-right md:table-cell">Скидка по строке</TableHead>
              <TableHead scope="col" class="px-3 text-right">Сумма</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="(line, index) in rows" :key="index" :class="{ 'bg-emerald-50/65 hover:bg-emerald-50': line.lowered }">
              <TableCell class="min-w-0 px-3 py-3 align-top whitespace-normal md:align-middle">
                <span class="break-words font-semibold">{{ line.name }}</span>
                <dl class="mt-1 grid gap-y-0.5 text-xs text-muted-foreground md:hidden">
                  <div v-if="line.changed" class="flex flex-wrap gap-x-1">
                    <dt>По каталогу</dt><dd :class="{ 'line-through': line.lowered }">{{ line.catalogPrice }}</dd>
                  </div>
                  <div class="flex flex-wrap gap-x-1"><dt>Цена продажи</dt><dd class="font-medium text-foreground">{{ line.salePrice }}</dd></div>
                  <div v-if="line.lowered" class="flex flex-wrap gap-x-1 font-medium text-emerald-800">
                    <dt>Скидка по строке</dt><dd>{{ money(line.discount) }}</dd>
                  </div>
                </dl>
              </TableCell>
              <TableCell class="text-right align-top whitespace-normal md:align-middle">{{ number.format(line.qty) }} {{ line.unit }}</TableCell>
              <TableCell class="hidden text-right text-muted-foreground md:table-cell">
                <span :class="{ 'line-through': line.lowered }">{{ line.catalogPrice }}</span>
              </TableCell>
              <TableCell class="hidden text-right font-medium md:table-cell" :class="{ 'text-emerald-800': line.lowered }">
                {{ line.salePrice }}
              </TableCell>
              <TableCell class="hidden text-right md:table-cell">
                <span v-if="line.lowered" class="inline-block rounded-md bg-emerald-100 px-2 py-1 font-semibold text-emerald-800">{{ money(line.discount) }}</span>
                <span v-else class="text-muted-foreground">—</span>
              </TableCell>
              <TableCell class="px-3 text-right align-top font-semibold md:align-middle">{{ money(line.amount) }}</TableCell>
            </TableRow>
            <TableRow v-if="!rows.length"><TableCell colspan="6" class="py-6 text-center text-muted-foreground">В чеке нет позиций</TableCell></TableRow>
          </TableBody>
        </Table>
      </div>

      <dl class="ml-auto grid w-full max-w-sm shrink-0 gap-2 rounded-xl border bg-card px-4 py-3 text-sm tabular-nums">
        <div v-if="lineDiscount" class="flex justify-between gap-3 text-emerald-800"><dt>Скидка по позициям</dt><dd class="font-medium">{{ money(lineDiscount) }}</dd></div>
        <div class="flex justify-between gap-3 text-muted-foreground"><dt>Скидка на чек</dt><dd>{{ money(receipt.discount) }}</dd></div>
        <div class="flex justify-between gap-3 border-t pt-2 text-base font-bold"><dt>Итого</dt><dd>{{ money(receipt.total) }}</dd></div>
        <div class="flex justify-between gap-3"><dt>Оплачено</dt><dd class="font-medium">{{ money(receipt.paid) }}</dd></div>
        <div class="flex justify-between gap-3"><dt>Долг</dt><dd class="font-medium" :class="{ 'text-destructive': debt > 0 }">{{ money(debt) }}</dd></div>
        <div v-if="change > 0" class="flex justify-between gap-3"><dt>Сдача</dt><dd class="font-medium">{{ money(change) }}</dd></div>
      </dl>
    </DialogContent>
  </Dialog>
</template>
