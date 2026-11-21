import { getAccounts } from '../../services/accounts/accounts.service'

import { onlyResources } from '../../services/workers/employee-scope'

export default defineEventHandler(event => onlyResources(getAccounts(), event.context.employee?.resources, 'accounts', 'id'))
