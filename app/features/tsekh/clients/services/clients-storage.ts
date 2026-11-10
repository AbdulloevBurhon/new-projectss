import { storageKey } from '~/features/tsekh/warehouse/services/inventory-storage'
import type { Client } from '../types/clients'

export const clientsStorageKey = 'workshop-clients-v1'

export function readClients(): Client[] {
  const saved = localStorage.getItem(clientsStorageKey)
  if (saved === null) return []
  const clients = JSON.parse(saved)
  if (!Array.isArray(clients) || clients.some(client => typeof client?.id !== 'string'
    || typeof client.name !== 'string' || typeof client.phone !== 'string')) {
    throw new Error('Не удалось прочитать список клиентов.')
  }
  return clients
}

export async function writeClients(update: (clients: Client[]) => void) {
  const commit = () => {
    const clients = readClients()
    update(clients)
    try {
      localStorage.setItem(clientsStorageKey, JSON.stringify(clients))
    } catch {
      throw new Error('Не удалось сохранить изменения в браузере.')
    }
    return clients
  }
  return navigator.locks ? navigator.locks.request(storageKey, commit) : commit()
}
