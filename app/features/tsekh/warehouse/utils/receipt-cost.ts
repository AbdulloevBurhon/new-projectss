import type { Receipt, TechCardMaterial } from '../types/inventory'

export function receiptCostCents(receipts: Receipt[], warehouseId: string, material: TechCardMaterial) {
  let receivedMilli = 0
  let receivedCents = 0
  for (const receipt of receipts) {
    if (receipt.warehouseId !== warehouseId) continue
    for (const line of receipt.lines) {
      if (line.productId !== material.productId || (line.stockUnit ?? line.unit) !== material.unit) continue
      const amount = Math.round((line.stockQuantity ?? line.quantity) * 1000)
      if (amount <= 0) continue
      receivedMilli += amount
      receivedCents += Math.round(line.sum * 100)
    }
  }
  if (!receivedMilli) return undefined
  const usedMilli = Math.round(material.quantity * 1000)
  return Math.round(usedMilli * (receivedCents / receivedMilli))
}
