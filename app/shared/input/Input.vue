<script setup lang="ts">
import Label from '../label/Label.vue'

defineOptions({ inheritAttrs: false })
const props = defineProps<{ label?: string; hint?: string; error?: string; id?: string; required?: boolean; bare?: boolean }>()
const model = defineModel<string>({ default: '' })
const inputId = useId()
const describedBy = computed(() => [props.hint && `${inputId}-hint`, props.error && `${inputId}-error`].filter(Boolean).join(' ') || undefined)
</script>

<template>
  <div class="shared-field" :class="{ 'shared-field-bare': bare }">
    <Label v-if="label" :html-for="id || inputId" :required="required">{{ label }}</Label>
    <input v-bind="$attrs" :id="id || inputId" v-model="model" :required="required" :aria-invalid="!!error" :aria-describedby="describedBy" class="shared-input" :class="{ 'shared-input-bare': bare }">
    <small v-if="hint && !error" :id="`${inputId}-hint`" class="shared-hint">{{ hint }}</small>
    <small v-if="error" :id="`${inputId}-error`" class="shared-error" role="alert">{{ error }}</small>
  </div>
</template>

<style scoped>
.shared-field { display: grid; gap: 6px; min-width: 0; }
.shared-field-bare { display: contents; }
.shared-input { width: 100%; min-height: 39px; border: 1px solid #d8e0ea; border-radius: 8px; padding: 7px 10px; color: var(--ink, #142238); background: #fff; font-size: 13px; font-weight: 500; outline: none; }
.shared-input-bare { min-height: 36px; border: 0; border-radius: 0; padding: 0; outline: none; background: transparent; }
.shared-input:focus { border-color: #77a92d; box-shadow: 0 0 0 3px #b9ed5a33; }
.shared-input[aria-invalid="true"] { border-color: #d34b58; }
.shared-hint, .shared-error { font-size: 12px; }
.shared-hint { color: #687991; }
.shared-error { color: #b42332; }
</style>
