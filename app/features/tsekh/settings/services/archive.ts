import { accountsStorageKey, readStoredLedger } from '~/features/tsekh/accounts/services/accounts-storage'
import { clientsStorageKey, readClients } from '~/features/tsekh/clients/services/clients-storage'
import { readInventory, storageKey } from '~/features/tsekh/warehouse/services/inventory-storage'
import { readWorkers, workersStorageKey } from '~/features/tsekh/workers/services/workers-storage'
import type { Archive } from '../types/settings'

function captureArchive(): Archive {
  return { format: 'workshop-04', version: 1, createdAt: new Date().toISOString(), inventory: readInventory(),
    workers: readWorkers(), ledger: readStoredLedger(), clients: readClients() }
}

export function snapshotArchive() {
  return navigator.locks ? navigator.locks.request(storageKey, captureArchive) : Promise.resolve().then(captureArchive)
}

export function archiveName(archive: Archive) {
  return `cekh-04-${new Date(archive.createdAt).toISOString().replaceAll(':', '-').replace('.000', '')}.json`
}

export function downloadArchive(archive: Archive) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(archive)], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = archiveName(archive)
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

export function restoreArchive(archive: Archive) {
  const entries = [[storageKey, JSON.stringify(archive.inventory)], [workersStorageKey, JSON.stringify(archive.workers)],
    [accountsStorageKey, JSON.stringify(archive.ledger)], [clientsStorageKey, JSON.stringify(archive.clients)]] as const
  const commit = () => {
    const previous = entries.map(([key]) => [key, localStorage.getItem(key)] as const)
    try {
      for (const [key] of entries) localStorage.removeItem(key)
      for (const [key, value] of entries) localStorage.setItem(key, value)
    } catch {
      for (const [key] of entries) localStorage.removeItem(key)
      for (const [key, value] of previous) if (value !== null) localStorage.setItem(key, value)
      throw new Error('Не удалось восстановить архив. Проверьте доступное место в браузере.')
    }
  }
  return navigator.locks ? navigator.locks.request(storageKey, commit) : Promise.resolve().then(commit)
}
