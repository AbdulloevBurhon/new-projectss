<script setup lang="ts">
import { ScanBarcode } from '@lucide/vue'
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle } from '@obshaya/ui'
import { ref } from 'vue'
import type { BarcodeScanResult } from './barcode'
import { useBarcodeScanner } from './useBarcodeScanner'

const props = defineProps<{ disabled: boolean; scan: (code: string) => BarcodeScanResult | Promise<BarcodeScanResult | undefined> }>()
const error = ref<{ title: string; message: string; code: string }>()
const errorOpen = ref(false)
const success = ref('')
const code = useBarcodeScanner(() => !props.disabled && !errorOpen.value, submit)

async function submit(value: string) {
  if (props.disabled || errorOpen.value || !value.trim()) return
  const result = props.scan(value)
  const outcome = result instanceof Promise ? await result : result
  if (!outcome || props.disabled || errorOpen.value) return
  success.value = outcome.ok ? outcome.message : ''
  if (!outcome.ok) {
    error.value = { title: outcome.title, message: outcome.message, code: value }
    errorOpen.value = true
  }
}

defineExpose({ submit })
</script>

<template>
  <div v-if="!disabled" class="flex min-w-0 items-start gap-2 text-sm text-muted-foreground">
    <ScanBarcode class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
    <p v-if="code" class="min-w-0 break-all">Штрихкод <strong class="font-medium tabular-nums text-foreground">{{ code }}</strong></p>
    <p v-else>Сканируйте штрихкод или введите код и нажмите Enter.</p>
  </div>
  <span class="sr-only" role="status">{{ success }}</span>
  <AlertDialog v-model:open="errorOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ error?.title }}</AlertDialogTitle>
        <AlertDialogDescription class="min-w-0 break-words">
          {{ error?.message }}
          <span class="mt-2 block">Код <strong>{{ error?.code }}</strong></span>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel>Понятно</AlertDialogCancel></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
