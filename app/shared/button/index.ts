export { default as Button } from './Button.vue'

export type ButtonVariants = {
  variant: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size: 'default' | 'sm' | 'lg' | 'icon'
}

export function buttonVariants(options: Partial<ButtonVariants> = {}) {
  return `shared-button shared-button--${options.variant ?? 'default'} shared-button--${options.size ?? 'default'}`
}
