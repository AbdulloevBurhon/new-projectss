import { receiptDetails } from '../../../endpoints/sales/service'
import { browserPrinterSettings, nativeReceiptPrinter, printOnDesktop } from '../../../endpoints/settings/printer/printer.service'
import { receiptTicket } from './receiptTicket'

export async function printReceipt(id: string) {
  if (nativeReceiptPrinter()) { await printOnDesktop(id); return }
  const { receipt, lines } = await receiptDetails(id)
  const settings = browserPrinterSettings()
  printBrowserTicket(receiptTicket(settings, receipt, lines), settings.width)
}

export function printBrowserTicket(text: string, width: 58 | 80) {
  const frame=document.createElement('iframe')
  frame.style.cssText='position:fixed;width:0;height:0;border:0'
  document.body.append(frame)
  const win=frame.contentWindow!
  const style = win.document.createElement('style')
  style.textContent = `@page { margin: 2mm; size: ${width}mm 297mm } body { margin: 0 } pre { font: 9pt/1.25 Consolas, monospace; white-space: pre-wrap; width: ${width - 4}mm; overflow-wrap: anywhere }`
  win.document.head.append(style)
  const block=win.document.createElement('pre')
  block.textContent=text
  win.document.body.append(block)
  win.onafterprint=()=>frame.remove()
  win.focus();win.print()
}
