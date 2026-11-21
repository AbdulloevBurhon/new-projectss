import type { Employee, EmployeeResourceSelection, WorkerSale } from './types'
import type { Right } from './permissions'

const base = '/api/workers'
const item = (id: string) => `${base}/${encodeURIComponent(id)}`
export const employees = () => $fetch<Employee[]>(base)
export const saveEmployee = (body: { name: string; role: string; phone: string; pin: string; resources?: EmployeeResourceSelection }, id?: string) =>
  $fetch(id ? item(id) : base, { method: id ? 'PATCH' : 'POST', body })
export const deleteEmployee = (id: string) => $fetch(item(id), { method: 'DELETE' })
export const saveEmployeeRights = (id: string, permissions: Right[]) =>
  $fetch(`${item(id)}/permissions`, { method: 'PATCH', body: { permissions } })
export const employeeSales = (id: string, from?: string, to?: string, signal?: AbortSignal) =>
  $fetch<WorkerSale[]>(`${item(id)}/sales`, { query: { from, to }, signal })
export const startEmployeeSession = (pin: string, id?: string) =>
  $fetch<{ token: string; profile: Employee }>(`${base}/session`, { method: 'POST', body: { id, pin } })
export const employeeSession = () => $fetch<Employee | null>(`${base}/session`)
export const endEmployeeSession = () => $fetch(`${base}/session`, { method: 'DELETE' })
export function employeeError(error: unknown, fallback: string) {
  const response = error as { data?: { data?: { message?: string }; statusMessage?: string } } | null
  return response?.data?.data?.message || response?.data?.statusMessage || fallback
}
