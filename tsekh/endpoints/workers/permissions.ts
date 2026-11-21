export const workerSections = [
  { id: 'warehouses', label: 'Склады', actions: true },
  { id: 'accounts', label: 'Счёт', actions: true },
  { id: 'workers', label: 'Сотрудники', actions: true },
  { id: 'clients', label: 'Клиенты', actions: true },
  { id: 'sales', label: 'Продажа', actions: false },
  { id: 'reports', label: 'Отчёты', actions: false },
  { id: 'summary', label: 'Итоги', actions: false },
] as const

export const posRights = [
  { id: 'sales.settings', label: 'Выбрать склад и счёт' },
  { id: 'sales.price', label: 'Изменить цену' },
  { id: 'sales.debt', label: 'Оплата в долг' },
  { id: 'sales.discount', label: 'Скидки' },
] as const

export type Section = typeof workerSections[number]['id']
export const clientPaymentRight = { id: 'clients.pay', label: 'Погашать долг' } as const
export type Right = Section | `${Section}.${'edit' | 'delete'}` | typeof posRights[number]['id'] | typeof clientPaymentRight.id
export const rights = workerSections.flatMap<Right>(s => s.actions ? [s.id, `${s.id}.edit`, `${s.id}.delete`] : [s.id])
  .concat(posRights.map(r => r.id), clientPaymentRight.id)

export function permits(permissions: readonly Right[], right: Right) {
  return permissions.includes(right) && permissions.includes(right.split('.')[0] as Section)
}
