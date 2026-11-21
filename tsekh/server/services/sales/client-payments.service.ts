import db from '../../database/warehouse/stock-receipts.schema'
import q from '../../database/sales/queries'

export const clientDetails = db.transaction((client: string) => {
  const totals = db.prepare(q.clientTotals).get({ client })
  if (!totals) throw createError({ statusCode: 404, message: 'Клиент не найден.' })
  return { totals, rows: db.prepare(q.clientHistory).all({ client }) }
})

export const repayClientDebt = db.transaction((client: string, body: Record<string, unknown>, employee: string) => {
  const { id, account, amount } = body ?? {}
  if (typeof id !== 'string' || !id || id.length > 100 || typeof account !== 'string' || !account
    || typeof amount !== 'number' || !Number.isSafeInteger(amount) || amount <= 0) {
    throw createError({ statusCode: 400, message: 'Проверьте счёт и сумму оплаты.' })
  }

  const existing = db.prepare(q.existingClientPayment).get({ id }) as
    { client: string; account: string; amount: number } | undefined
  if (existing) {
    if (existing.client === client && existing.account === account && existing.amount === amount) return { id }
    throw createError({ statusCode: 409, message: 'Этот платёж уже сохранён. Откройте форму заново и проверьте долг.' })
  }

  if (!db.prepare(q.postClientPayment).run({ id, client, account, amount, employee, date: new Date().toISOString() }).changes) {
    throw createError({ statusCode: 409, message: 'Проверьте текущий долг клиента и выбранный счёт.' })
  }
  db.prepare(q.creditClientPayment).run({ account, amount })
  return { id }
}).immediate
