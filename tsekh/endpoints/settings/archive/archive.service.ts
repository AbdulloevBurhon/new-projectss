import { createProductArchive, restoreProductArchive } from '@obshaya/contracts/client-archive'
import { accountsKey } from '../../accounts/accounts.service'
import { warehousesKey } from '../../warehouse/get-warehouses/get-warehouses.service'
import { productsKey } from '../../warehouse/products/products.service'

const sqliteCacheKeys = [accountsKey, warehousesKey, productsKey]

export async function createWorkshopArchive() {
  const database = await $fetch('/api/data-archive')
  return createProductArchive('tsekh', { database, excludedKeys: sqliteCacheKeys })
}

export function restoreWorkshopArchive(file: File) {
  return restoreProductArchive(file, 'tsekh', {
    restoreDatabase: snapshot => $fetch('/api/data-archive', { method: 'PUT', body: snapshot as Record<string, unknown> }),
    excludedKeys: sqliteCacheKeys,
    confirm: includesDatabase => window.confirm(includesDatabase
      ? 'Восстановить архив? Текущие данные «Цеха» будут заменены данными из файла.'
      : 'Импортировать старый архив? Он заменит данные браузера. Данные SQLite в этом файле отсутствуют.'),
  })
}
