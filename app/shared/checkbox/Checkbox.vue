<script setup lang="ts">
const props = defineProps<{ label?: string; disabled?: boolean; id?: string; value?: string | number }>()
const checked = defineModel<boolean | string[] | number[]>({ default: false })
const inputId = useId()
const isChecked = computed(() => Array.isArray(checked.value) ? checked.value.includes(props.value as never) : checked.value)
function update(event: Event) {
  const value = (event.target as HTMLInputElement).checked
  if (Array.isArray(checked.value)) {
    const items = [...checked.value]
    const index = items.indexOf(props.value as never)
    if (value && index < 0) items.push(props.value as never)
    if (!value && index >= 0) items.splice(index, 1)
    checked.value = items
  } else checked.value = value
}
</script>

<template>
  <label class="shared-checkbox" :class="{ 'is-disabled': disabled }" :for="id || inputId">
    <input :id="id || inputId" type="checkbox" :checked="isChecked" :disabled="disabled" @change="update">
    <span v-if="label || $slots.default"><slot>{{ label }}</slot></span>
  </label>
</template>

<style scoped>
.shared-checkbox { display: inline-flex; align-items: center; gap: 8px; color: #26364b; font-size: 13px; cursor: pointer; }
.shared-checkbox input { width: 16px; height: 16px; margin: 0; accent-color: var(--accent, #a8df3e); }
.shared-checkbox.is-disabled { opacity: .55; cursor: not-allowed; }
</style>
