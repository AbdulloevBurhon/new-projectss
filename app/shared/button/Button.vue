<script setup lang="ts">
import type { ButtonHTMLAttributes, HTMLAttributes } from 'vue'
import { cn } from '~/lib/utils'
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
      :class="cn(buttonVariants({ variant: props.variant, size: props.size }), props.class)"
  >
    <slot />
  </button>
</template>
