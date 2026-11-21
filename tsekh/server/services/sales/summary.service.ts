import db from '../../database/accounts/accounts.database'
import q from '../../database/sales/queries'
import type { SummaryDay } from '../../../endpoints/summary/summary.service'
import type { EmployeeResourceAccess } from '../../../endpoints/workers/types'
import { resourceParameters } from '../workers/employee-resource-access'
import './sales.service'

const daily = db.prepare(q.summaryDaily)
const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const hour = 3_600_000

export function loadSummary(value: unknown, scope?: EmployeeResourceAccess) {
  const days = typeof value === 'string' && value.length <= 774 ? value.split(',') : []
  const invalid = days.length < 2 || days.length > 31 || days.some((day, index) => {
    const time = Date.parse(day)
    if (!iso.test(day) || !Number.isFinite(time) || new Date(time).toISOString() !== day) return true
    if (!index) return false
    const span = time - Date.parse(days[index - 1]!)
    return span < 22 * hour || span > 26 * hour
  })
  if (invalid) throw createError({ statusCode: 400, message: 'Проверьте период итогов.' })
  return daily.all({ boundaries: JSON.stringify(days), ...resourceParameters(scope) }) as SummaryDay[]
}
