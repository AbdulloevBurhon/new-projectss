import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { barcodeMaxLength } from '../../../endpoints/warehouse/products/products.types'

const editable = [
  'input:not([type="checkbox"], [type="radio"], [type="button"], [type="submit"], [type="reset"])',
  'textarea', 'select', '[contenteditable]:not([contenteditable="false"])', '[role="textbox"]', '[role="combobox"]',
].join(', ')
const openDialog = 'dialog[open], [role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]'
const idleTime = 5000

export function useBarcodeScanner(enabled: () => boolean, submit: (code: string) => void) {
  const code = ref('')
  let idle: ReturnType<typeof setTimeout> | undefined
  let submittedEnter = false

  function clear() {
    clearTimeout(idle)
    code.value = ''
  }

  function onKey(event: KeyboardEvent) {
    if (event.key === 'Enter' && event.repeat && submittedEnter) {
      event.preventDefault()
      return
    }
    if (!enabled() || event.defaultPrevented || event.isComposing || event.key === 'Process'
      || (event.target instanceof Element && event.target.closest(editable))
      || document.querySelector(openDialog)) {
      clear()
      return
    }
    if (event.ctrlKey || event.metaKey || event.altKey) {
      clear()
      return
    }
    if (event.key === 'Enter' && code.value) {
      event.preventDefault()
      if (event.repeat) return
      submittedEnter = true
      const value = code.value
      clear()
      if (value.trim()) submit(value)
      return
    }
    if (code.value && (event.key === 'Backspace' || event.key === 'Escape')) {
      event.preventDefault()
      if (event.key === 'Escape') clear()
      else code.value = code.value.slice(0, -1)
      return
    }
    if (event.key.length !== 1 || (!code.value && !event.key.trim())) {
      if (event.key !== 'Shift') clear()
      return
    }
    event.preventDefault()
    if (event.repeat) return
    // Keep one extra character so an oversized code cannot match a valid prefix.
    if (code.value.length <= barcodeMaxLength) code.value += event.key
    clearTimeout(idle)
    idle = setTimeout(clear, idleTime)
  }

  function onKeyUp(event: KeyboardEvent) {
    if (event.key === 'Enter') submittedEnter = false
  }

  watch(enabled, clear, { flush: 'sync' })
  onMounted(() => {
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('keyup', onKeyUp, true)
    window.addEventListener('focusin', clear)
    window.addEventListener('pointerdown', clear)
    window.addEventListener('blur', clear)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKey, true)
    window.removeEventListener('keyup', onKeyUp, true)
    window.removeEventListener('focusin', clear)
    window.removeEventListener('pointerdown', clear)
    window.removeEventListener('blur', clear)
    clear()
  })
  return code
}
