import { pinChanged, readPin, removePin, savePin, verifyPin } from '../services/local-pin'
import type { ProductId } from '~~/shared/contracts/product'

export function useProductPin(productId: ProductId) {
  const prefix = productId === 'shawarma' ? 'shawarma-pin' : 'workshop-pin'
  const ready = useState(`${prefix}-ready`, () => false)
  const configured = useState(`${prefix}-configured`, () => false)
  const locked = useState(`${prefix}-locked`, () => false)
  const error = useState(`${prefix}-error`, () => '')

  function load(force = false) {
    if (ready.value && !force) return
    try {
      configured.value = !!readPin(productId)
      locked.value = configured.value
      error.value = ''
    } catch (cause) {
      locked.value = true
      error.value = cause instanceof Error ? cause.message : 'Не удалось проверить ПИН-код.'
    } finally {
      ready.value = true
    }
  }

  function sync(event: StorageEvent) {
    if (pinChanged(event.key, productId)) load(true)
  }

  async function configure(pin: string) {
    await savePin(pin, productId)
    configured.value = true
  }

  async function unlock(pin: string) {
    if (!await verifyPin(pin, productId)) throw new Error('Неверный ПИН-код.')
    locked.value = false
  }

  function clear() {
    removePin(productId)
    configured.value = false
    locked.value = false
  }

  function lock() { locked.value = configured.value }

  return { ready, configured, locked, error, load, sync, unlock, configure, clear, lock }
}
