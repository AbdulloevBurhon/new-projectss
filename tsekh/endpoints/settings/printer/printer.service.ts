export type PrinterSettings = {
  storeName: string
  printerName: string
  connection: 'windows' | 'lan'
  queue: string
  ip: string
  port: number
  width: 58 | 80
}

const key = 'tsekh:receipt-printer'
const path = '/api/receipt-printer'
const defaults: PrinterSettings = { storeName: '', printerName: '', connection: 'windows', queue: '', ip: '', port: 9100, width: 80 }
export const nativeReceiptPrinter = () => typeof window !== 'undefined' && (window as Window & { workshopReceiptPrinter?: boolean }).workshopReceiptPrinter === true

export function browserPrinterSettings(): PrinterSettings {
  try {
    const current = JSON.parse(localStorage.getItem(key) ?? 'null') as Partial<PrinterSettings> | null
    return {
      ...defaults, storeName: typeof current?.storeName === 'string' ? current.storeName : '',
      printerName: typeof current?.printerName === 'string' ? current.printerName : '',
      width: current?.width === 58 ? 58 : 80,
    }
  } catch { return { ...defaults } }
}

export const getPrinter = () => nativeReceiptPrinter()
  ? $fetch<{ settings: PrinterSettings; printers: string[] }>(path)
  : Promise.resolve({ settings: browserPrinterSettings(), printers: [] })

export async function savePrinter(settings: PrinterSettings) {
  if (nativeReceiptPrinter()) return $fetch<PrinterSettings>(path, { method: 'PUT', body: settings })
  localStorage.setItem(key, JSON.stringify(settings))
  return settings
}

export const testPrinter = (settings: PrinterSettings) => $fetch(path + '/test', { method: 'POST', body: settings })
export const printOnDesktop = (id: string) => $fetch(path + '/print', { method: 'POST', body: { id } })
export function printerError(error: unknown) {
  return (error as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Не удалось выполнить операцию с принтером.'
}
