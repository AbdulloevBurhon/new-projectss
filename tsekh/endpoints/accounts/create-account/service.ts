import type { CreateAccountInput, CreatedAccount } from './types'

export function createAccount(input: CreateAccountInput) {
  return $fetch<CreatedAccount>('/api/accounts', { method: 'POST', body: input })
}
