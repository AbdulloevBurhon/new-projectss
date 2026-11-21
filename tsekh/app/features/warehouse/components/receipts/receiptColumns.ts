export const receiptColumns = [
  { key: 'product', label: 'Товар' },
  { key: 'barcode', label: 'Штрих', class: 'w-44' },
  { key: 'quantity', label: 'Количество', class: 'w-32' },
  { key: 'unitPrice', label: 'Цена закупки', class: 'w-52' },
  { key: 'salePrice', label: 'Цена продажи', class: 'w-52' },
  { key: 'expiry', label: 'Срок', class: 'w-36' },
  { key: 'sum', label: 'Сумма закупки', align: 'right' as const },
  { key: 'revenue', label: 'Ожидаемая выручка', align: 'right' as const },
  { key: 'actions', label: 'Действия', align: 'right' as const },
]
