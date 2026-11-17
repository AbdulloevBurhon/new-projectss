import { clientApi, downloadClientFile, getClientPin, installationId } from '@obshaya/contracts/client-api'
import { findClientUpdate } from '@obshaya/contracts/client-updates'
import type { ClientUpdate, DesktopUpdates } from './updates.types'

export const desktopUpdates = () => (window as Window & { workshopUpdates?: DesktopUpdates }).workshopUpdates

export const findUpdate = (base: string, version: string) => findClientUpdate(base, version, 'tsekh')

export function installOrDownloadUpdate(base: string, update: ClientUpdate) {
  const desktop = desktopUpdates()
  if (desktop) return desktop.install({ ...update, installationId: installationId('tsekh'), pin: getClientPin() })
  return downloadClientFile(base, `/api/client/updates/${update.id}/download`, 'tsekh')
}

export async function reportInstalledUpdate(base: string, version: string) {
  const desktop = desktopUpdates()
  if (!desktop || !navigator.onLine || !getClientPin()) return
  const receipt = await desktop.readReceipt()
  if (!receipt || receipt[1] !== version) return

  await clientApi(base, `/api/client/updates/${encodeURIComponent(receipt[0])}/receipt`, {
    method: 'POST', body: JSON.stringify({ installed: true }),
  }, 'tsekh')
  await desktop.clearReceipt()
}
