import type { Worker } from '~/features/tsekh/workers/types/workers'
import type { AccountMovement } from '../types/accounts'

export function workMovements(workers: Worker[]) {
  const payments = new Map<string, AccountMovement>()
  for (const worker of workers) {
    for (const record of worker.records) {
      const payment = record?.payment
      if (!payment) continue
      const movement = payments.get(payment.id)
      if (movement) movement.cents += record.wageCents
      else payments.set(payment.id, {
        id: `work-${payment.id}`,
        kind: 'expense',
        accountId: payment.accountId,
        date: payment.date,
        createdAt: record.createdAt,
        cents: record.wageCents,
        note: `Зарплата · ${payment.workerName}`,
        workPaymentId: payment.id,
      })
    }
  }
  return [...payments.values()]
}
