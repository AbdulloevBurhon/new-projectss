<script setup lang="ts">
import type { ButtonHTMLAttributes, HTMLAttributes } from 'vue'
import { type ButtonVariants, buttonVariants } from '.'

defineOptions({
  inheritAttrs: false,
})

interface Props {
  variant?: ButtonVariants['variant']
  size?: ButtonVariants['size']
  class?: HTMLAttributes['class']
  type?: ButtonHTMLAttributes['type']
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'button',
  disabled: false,
})

const attrs = useAttrs()
const ariaLabel = computed(() => attrs['aria-label'] || attrs.title)
</script>

<template>
  <button
      v-bind="attrs"
      :type="props.type"
      :disabled="props.disabled"
      :aria-label="ariaLabel"
      :class="[buttonVariants({ variant: props.variant, size: props.size }), props.class]"
  >
    <slot />
  </button>
</template>

<style scoped>
.shared-button { display: inline-flex; flex: none; align-items: center; justify-content: center; gap: 8px; min-height: 39px; border: 1px solid transparent; border-radius: 8px; padding: 8px 15px; color: #142238; background: #fff; font-size: 13px; font-weight: 700; white-space: nowrap; cursor: pointer; transition: background-color .15s, border-color .15s, color .15s; }
.shared-button:focus-visible { outline: 3px solid #568a234d; outline-offset: 2px; }
.shared-button:disabled { opacity: .55; cursor: not-allowed; }
.shared-button--default { border-color: #b9e65e; color: #172711; background: var(--accent, #b9ed5a); }
.shared-button--default:not(:disabled):hover { background: #b7e858; }
.shared-button--destructive { color: #fff; background: #ae2636; }
.shared-button--destructive:not(:disabled):hover { background: #8d1e2b; }
.shared-button--outline, .shared-button--secondary { border-color: #d9e1eb; background: #fff; }
.shared-button--outline:not(:disabled):hover, .shared-button--secondary:not(:disabled):hover { background: #f0f4f8; }
.shared-button--ghost { background: transparent; }
.shared-button--ghost:not(:disabled):hover { background: #eef2f7; }
.shared-button--link { min-height: auto; padding: 0; border: 0; color: #315f9a; text-decoration: underline; }
.shared-button--sm { min-height: 34px; padding: 6px 11px; }
.shared-button--lg { min-height: 44px; padding: 10px 22px; }
.shared-button--icon { width: 39px; height: 39px; padding: 0; }
</style>
