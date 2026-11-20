import { ref } from 'vue'
import { listActivationMessages, listRequests } from '../../admin-endpoints/requests/requests.service'
import type { ActivationSupportMessage } from '../../admin-endpoints/requests/requests.types'
import { getAdminKey } from '../../admin-endpoints/core/admin-api'

export type RequestItem = { id: string; client: string; direction: string; device: string; version: string; received: string; licenseUntil: string }
export type VersionChange = { date: string; from: string; to: string }
export type ClientItem = { id: string; client: string; direction: string; device: string; licenseFrom: string; licenseUntil: string; cloudArchiveAllowed: boolean; active: boolean; expired: boolean; version: string; versionUpdatedAt: string; versionHistory: VersionChange[]; unreadMessages: number }

export const requests = ref<RequestItem[]>([])
export const activationMessages = ref<ActivationSupportMessage[]>([])
export const clients = ref<ClientItem[]>([])

let pendingRequests: Promise<void> | undefined

export function refreshRequestInbox() {
  const key = getAdminKey()
  pendingRequests ??= Promise.all([listRequests(), listActivationMessages()])
    .then(([requestRows, messageRows]) => {
      if (getAdminKey() !== key) return
      requests.value = requestRows
      activationMessages.value = messageRows
    })
    .finally(() => { pendingRequests = undefined })
  return pendingRequests
}
