import schema from './schema.json'
import catalog from './catalog.json'
import checkout from './checkout.json'
import stock from './stock.json'
import reports from './reports.json'
import employees from './employees.json'
import clientPayments from './client-payments.json'
import accountHistory from './account-history.json'
import workerResources from './worker-resources.json'
import ownerPin from './owner-pin.json'
import telegramSchedule from './telegram-schedule.json'
import summary from './summary.json'
import revision from './revision.json'
import expiry from './expiry.json'

const definitions = { ...schema, ...catalog, ...checkout, ...stock, ...reports, ...employees, ...clientPayments, ...accountHistory, ...workerResources, ...ownerPin, ...telegramSchedule, ...summary, ...revision, ...expiry }
export default Object.fromEntries(
  Object.entries(definitions).map(([name, lines]) => [name, lines.join('\n')]),
) as Record<keyof typeof definitions, string>
