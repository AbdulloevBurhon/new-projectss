import { loadSummary } from '../services/sales/summary.service'

export default defineEventHandler(event => {
  setHeader(event, 'Cache-Control', 'no-store')
  return loadSummary(getQuery(event).boundaries, event.context.employee?.resources)
})
