export interface UpdateManifest {
  direction: 'tsekh'
  version: string
  notes: string
  downloadUrl: string
  sha256: string
}
import type { ClientUpdate } from '@obshaya/contracts/client-updates'
export type { ClientUpdate } from '@obshaya/contracts/client-updates'

export type DesktopUpdates = {
  install(update: ClientUpdate & { installationId: string; pin: string }): Promise<void>
  readReceipt(): Promise<[string, string] | undefined>
  clearReceipt(): Promise<void>
}
