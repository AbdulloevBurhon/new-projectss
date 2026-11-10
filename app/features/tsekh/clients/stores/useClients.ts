import { createId } from '~/features/license/utils/createId'
import { readLedger } from '~/features/tsekh/accounts/services/accounts-storage'
import { clientsStorageKey, readClients, writeClients } from '../services/clients-storage'
import type { Client, ClientDraft } from '../types/clients'

export function useClients() {
  const clients = useState<Client[]>('workshop-clients', () => [])
  const ready = useState('workshop-clients-ready', () => false)
  const error = useState('workshop-clients-error', () => '')

  function load() {
    try {
      clients.value = readClients()
      error.value = ''
    } catch {
      error.value = 'Не удалось загрузить клиентов.'
    } finally {
      ready.value = true
    }
  }

  function sync(event: StorageEvent) {
    if (event.key === clientsStorageKey || event.key === null) load()
  }

  async function saveClient(draft: ClientDraft, id?: string) {
    const name = draft.name.trim()
    const phone = draft.phone.trim()
    if (!name || name.length > 100) throw new Error('Введите имя до 100 символов.')
    if (!/\d/.test(phone) || phone.length > 40) throw new Error('Введите телефон до 40 символов.')
    const clientId = id ?? createId()
    clients.value = await writeClients(items => {
      if (!id) {
        items.push({ id: clientId, name, phone })
        return
      }
      const client = items.find(item => item.id === id)
      if (!client) throw new Error('Клиент уже удалён.')
      Object.assign(client, { name, phone })
    })
    return clientId
  }

  async function deleteClient(id: string) {
    clients.value = await writeClients(items => {
      if (readLedger().movements.some(item => item.clientSale?.clientId === id)) {
        throw new Error('У клиента есть покупки. Сначала отмените связанные продажи.')
      }
      const index = items.findIndex(item => item.id === id)
      if (index === -1) throw new Error('Клиент уже удалён.')
      items.splice(index, 1)
    })
  }

  return { clients, ready, error, load, sync, saveClient, deleteClient }
}
