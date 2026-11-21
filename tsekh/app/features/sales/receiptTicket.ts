import { cents, money, type Position, type Receipt } from '../../../endpoints/sales/service'
import type { PrinterSettings } from '../../../endpoints/settings/printer/printer.service'

const numeric = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 9, useGrouping: false })
const singleLine = (value: string) => value.replace(/[\x00-\x1f\x7f]/g, ' ').trim()

function wrap(value: string, columns: number) {
  const lines: string[] = []
  let text = singleLine(value)
  while (text.length > columns) {
    const space = text.lastIndexOf(' ', columns)
    const end = space > 0 ? space : columns
    lines.push(text.slice(0, end))
    text = text.slice(end).trimStart()
  }
  return [...lines, text]
}

export function receiptTicket(settings: PrinterSettings, receipt: Receipt, items: Position[], sample = false): string {
  const columns = settings.width === 58 ? 32 : 48
  const divider = '-'.repeat(columns)
  const center = (text: string) => wrap(text, columns).map(line => ' '.repeat(Math.floor((columns - line.length) / 2)) + line)
  const pair = (label: string, value: string) => label + ' '.repeat(Math.max(1, columns - label.length - value.length)) + value
  const debt = receipt.total - receipt.paid, change = receipt.tender - receipt.paid
  return [
    ...center(settings.storeName || 'Цех'), ...center(sample ? 'Пробный чек' : 'Чек продажи'),
    ...wrap(new Date(receipt.date).toLocaleString('ru-RU'), columns),
    ...(sample ? [] : wrap('Чек № ' + receipt.id, columns)),
    ...wrap('Склад: ' + receipt.warehouseName, columns),
    ...wrap('Счёт: ' + receipt.accountName, columns),
    ...wrap('Сотрудник: ' + receipt.seller, columns),
    ...(receipt.clientName ? wrap('Клиент: ' + receipt.clientName, columns) : []),
    divider,
    ...items.flatMap(line => {
      const reduced = line.price < line.listPrice && numeric.format(line.price) !== numeric.format(line.listPrice)
      return [
        ...wrap(line.name, columns),
        ...wrap(numeric.format(line.qty) + ' ' + line.unit + ' × ' + numeric.format(line.price) + ' сом = ' + money(line.amount), columns),
        ...(reduced ? wrap('По каталогу ' + numeric.format(line.listPrice) + ' сом', columns)
          .concat(wrap('Скидка ' + money(Math.max(0, cents(line.qty * line.listPrice) - line.amount)), columns)) : []),
      ]
    }),
    divider,
    ...(receipt.discount > 0 ? [pair('Скидка на чек', money(receipt.discount))] : []),
    pair('ИТОГО', money(receipt.total)), pair('Оплачено', money(receipt.paid)),
    ...(debt > 0 ? [pair('Долг', money(debt))] : []),
    ...(change > 0 ? [pair('Сдача', money(change))] : []),
  ].flatMap(line => line.length <= columns ? [line] : wrap(line, columns)).join('\n')
}

export function sampleReceiptTicket(settings: PrinterSettings) {
  return receiptTicket(settings, {
    id: '', date: new Date().toISOString(), warehouseName: 'Основной склад', accountName: 'Касса',
    clientName: 'Тестовый клиент', seller: 'Кассир', role: '', discount: 0, total: 500, paid: 500, tender: 500,
  }, [{ name: 'Картошка', qty: 1, unit: 'кг', price: 5, listPrice: 6, amount: 500 }], true)
}
