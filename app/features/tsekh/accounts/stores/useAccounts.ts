import { createId } from '~/features/license/utils/createId'
import { accountsStorageKey, emptyLedger, readLedger, writeLedger } from '../services/accounts-storage'
import type { Account, AccountMovement, Ledger, MovementDraft } from '../types/accounts'
import { accountBalances, parseAmount, validDate } from '../utils/ledger'
import { storageKey } from '~/features/tsekh/warehouse/services/inventory-storage'
import { workersStorageKey } from '~/features/tsekh/workers/services/workers-storage'

export function useAccounts() {
  const ledger = useState('workshop-accounts', emptyLedger)
  const ready = useState('workshop-accounts-ready', () => false)
  const error = useState('workshop-accounts-error', () => '')
  const balances = computed(() => accountBalances(ledger.value))

  function load() {
    try {
      ledger.value = readLedger()
      error.value = ''
    } catch {
      error.value = 'Хранилище счетов недоступно. Обновите страницу и попробуйте снова.'
    } finally {
      ready.value = true
    }
  }

  function sync(event: StorageEvent) {
    if (event.key === accountsStorageKey || event.key === storageKey || event.key === workersStorageKey || event.key === null) load()
  }

  async function change(update: (data: Ledger) => void) {
    ledger.value = await writeLedger(update)
  }

  function saveAccount(input: string, opening: number | string, id?: string) {
    return change(data => {
      const name = input.trim()
      if (!name || name.length > 100) throw new Error('Введите название до 100 символов.')
      const account: Account = { id: id ?? createId(), name, openingCents: parseAmount(opening, 0) }
      if (!id) {
        data.accounts.push(account)
        return
      }
      const index = data.accounts.findIndex(item => item.id === id)
      if (index === -1) throw new Error('Счёт уже удалён.')
      data.accounts[index] = account
    })
  }

  function deleteAccount(id: string) {
    return change(data => {
      if (data.movements.some(item => item.accountId === id)) {
        throw new Error('У счёта есть операции. Сначала удалите их.')
      }
      data.accounts = data.accounts.filter(account => account.id !== id)
    })
  }

  function saveMovement(draft: MovementDraft, id?: string) {
    return change(data => {
      if (!data.accounts.some(item => item.id === draft.accountId)) throw new Error('Выберите существующий счёт.')
      if (!validDate(draft.date)) throw new Error('Укажите дату операции.')
      const note = draft.note.trim()
      if (note.length > 240) throw new Error('Заметка должна быть не длиннее 240 символов.')
      const movement: AccountMovement = {
        id: id ?? createId(), kind: draft.kind, accountId: draft.accountId,
        date: draft.date, cents: parseAmount(draft.amount, 0.01), note,
      }
      if (!id) {
        data.movements.push({ ...movement, createdAt: new Date().toISOString() })
        return
      }
      const index = data.movements.findIndex(item => item.id === id && item.kind === draft.kind)
      if (index === -1) throw new Error('Операция уже удалена.')
      if (data.movements[index]?.sale) throw new Error('Эта операция связана с продажей.')
      if (data.movements[index]?.receiptId) throw new Error('Эта операция связана с поступлением на склад.')
      if (data.movements[index]?.workPaymentId) throw new Error('Измените оплату в разделе «Рабочие».')
      data.movements[index] = { ...movement, createdAt: data.movements[index]?.createdAt }
    })
  }

  function deleteMovement(id: string) {
    return change(data => {
      const movement = data.movements.find(item => item.id === id)
      if (movement?.sale) throw new Error('Отмените оплату в разделе «Продажи».')
      if (movement?.receiptId) throw new Error('Эта операция связана с поступлением на склад.')
      if (movement?.workPaymentId) throw new Error('Управляйте оплатой в разделе «Рабочие».')
      data.movements = data.movements.filter(item => item.id !== id)
    })
  }

  return { ledger, ready, error, balances, load, sync, change, saveAccount, deleteAccount, saveMovement, deleteMovement }
}
