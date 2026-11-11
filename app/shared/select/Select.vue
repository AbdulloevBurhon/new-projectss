<script setup lang="ts">
import Label from '../label/Label.vue'

defineOptions({ inheritAttrs: false })
interface Option { label: string; value: string | number; disabled?: boolean }
const props = defineProps<{ options: Option[]; label?: string; hint?: string; error?: string; id?: string; required?: boolean; disabled?: boolean }>()
const model = defineModel<string | number>()
const selectId = useId()
const describedBy = computed(() => [props.hint && `${selectId}-hint`, props.error && `${selectId}-error`].filter(Boolean).join(' ') || undefined)
</script>

<template>
  <div class="shared-field">
    <Label v-if="label" :html-for="id || selectId" :required="required">{{ label }}</Label>
    <select v-bind="$attrs" :id="id || selectId" v-model="model" :required="required" :disabled="disabled" :aria-invalid="!!error" :aria-describedby="describedBy" class="shared-select">
      <slot name="placeholder" />
      <option v-for="option in options" :key="String(option.value)" :value="option.value" :disabled="option.disabled">{{ option.label }}</option>
    </select>
    <small v-if="hint && !error" :id="`${selectId}-hint`" class="shared-hint">{{ hint }}</small>
    <small v-if="error" :id="`${selectId}-error`" class="shared-error" role="alert">{{ error }}</small>
  </div>
</template>

<style scoped>
.shared-field { display: grid; gap: 6px; min-width: 0; }
.shared-select { width: 100%; min-height: 39px; border: 1px solid #d8e0ea; border-radius: 8px; padding: 7px 32px 7px 10px; color: var(--ink, #142238); background: #fff; font-size: 13px; font-weight: 500; }
.shared-select:focus { border-color: #77a92d; outline: 3px solid #b9ed5a33; }
.shared-select:disabled { opacity: .55; cursor: not-allowed; }
.shared-select[aria-invalid="true"] { border-color: #d34b58; }
.shared-hint, .shared-error { font-size: 12px; }
.shared-hint { color: #687991; }
.shared-error { color: #b42332; }
</style>
