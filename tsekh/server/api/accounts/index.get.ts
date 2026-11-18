import { getAccounts } from '../../services/accounts/accounts.service'

export default defineEventHandler(() => getAccounts())
