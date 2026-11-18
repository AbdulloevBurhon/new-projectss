import type { UpdateAccountInput, UpdatedAccount } from './types'

export function updateAccount({ id, name }: UpdateAccountInput) {
  return $fetch<UpdatedAccount>(`/api/accounts/${encodeURIComponent(id)}`, {
    method: 'PATCH', body: { name },
  })
}
