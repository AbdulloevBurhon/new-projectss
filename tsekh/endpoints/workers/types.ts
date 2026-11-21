import type { Right } from './permissions'

export interface Employee {
  id: string
  name: string
  role: string
  phone: string
  permissions: Right[]
  resources?: EmployeeResourceAccess
}

export interface EmployeeResourceAccess {
  warehouses: string[] | null
  accounts: string[] | null
}

export type EmployeeResourceSelection = Partial<Record<keyof EmployeeResourceAccess, string[]>>

export interface WorkerSale {
  id: string
  date: string
  total: number
  debt: number
  clientName: string | null
  lines: { name: string; qty: number; unit: string }[]
}
