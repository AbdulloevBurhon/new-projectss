import type { Inventory, Product, Receipt, ReceiptLine } from '../types/inventory'

interface StoredInventory extends Inventory {
  products: (Product & { litersPerPackage?: number })[]
  receipts: (Omit<Receipt, 'lines'> & { lines: (ReceiptLine & { volumeLiters?: number })[] })[]
}

export function normalizeInventory(inventory: StoredInventory): Inventory {
  return {
    ...inventory,
    products: inventory.products.map(({ litersPerPackage, ...product }) => {
      const quantityPerPiece = product.quantityPerPiece ?? litersPerPackage
      return quantityPerPiece && !product.contentUnit
        ? { ...product, unit: 'шт', contentUnit: product.unit, quantityPerPiece }
        : product
    }),
    receipts: inventory.receipts.map(receipt => ({
      ...receipt,
      lines: receipt.lines.map(({ volumeLiters, ...line }) =>
        volumeLiters !== undefined && line.stockQuantity === undefined
          ? { ...line, stockQuantity: volumeLiters, stockUnit: 'л' }
          : line,
      ),
    })),
  }
}
