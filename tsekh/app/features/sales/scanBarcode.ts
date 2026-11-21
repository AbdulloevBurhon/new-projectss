import { basis, type Goods, type Line, type SaleGoods } from '../../../endpoints/sales/service'
import { barcodeMaxLength } from '../../../endpoints/warehouse/products/products.types'
import { barcodeKey, type BarcodeScanResult } from '../../components/barcode/barcode'

export const saleLine = (product: Goods): Line => ({
  ...product, key: crypto.randomUUID(), mode: 'pack', qty: 1, actual: product.price,
})

const cannotAdd = (message: string): BarcodeScanResult => ({ ok: false, title: 'Не удалось добавить товар', message })

export function addByBarcode(code: string, products: SaleGoods[], cart: Line[]): BarcodeScanResult {
  if (code.length > barcodeMaxLength) return cannotAdd('Штрихкод слишком длинный.')
  const key = barcodeKey(code)
  const matches = key ? products.filter(row => row.barcode && barcodeKey(row.barcode) === key) : []
  if (!matches.length) return { ok: false, title: 'Товар не найден', message: 'На выбранном складе нет товара в наличии с таким штрихкодом.' }
  if (matches.length > 1) return cannotAdd('У этого штрихкода несколько позиций. Выберите нужную в списке товаров.')
  const product = matches[0]!
  const lines = cart.filter(row => row.id === product.id)
  const used = lines.reduce((total, row) => total + Math.max(0, Number(row.qty)) * basis(row).ratio, 0)
  if (!Number.isFinite(used) || used + 1 > product.stock + 1e-9) {
    return cannotAdd(`${product.name}: не хватает остатка для добавления 1 ${product.unit}. Количество можно указать вручную.`)
  }
  const existing = lines.find(row => row.mode === 'pack' && Number(row.actual) === product.price
    && Number(row.qty) > 0 && (!['шт', 'уп'].includes(row.unit) || Number.isInteger(Number(row.qty))))
  if (existing) existing.qty = Number(existing.qty) + 1
  else cart.push(saleLine(product))
  return { ok: true, message: `В корзине: ${product.name}, добавлено 1 ${product.unit}.` }
}
