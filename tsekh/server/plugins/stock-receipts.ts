import { processStockReceipts } from '../services/warehouse/stock-receipts.service'

export default defineNitroPlugin(nitro => {
  const timer = setInterval(() => {
    try {
      processStockReceipts()
    } catch (error) {
      console.error('Не удалось провести поступление.', error)
    }
  }, 500)
  timer.unref()
  nitro.hooks.hook('close', () => clearInterval(timer))
})
