<script setup lang="ts">
import { useEmployeeAccess } from '../../workers/composables/useEmployeeAccess'
import AccountDetailsDialog from './AccountDetailsDialog.vue'
import AccountFormDialog from './AccountFormDialog.vue'
import type { AccountRecord } from '../../../../endpoints/accounts/get-accounts/types'
import { saveAccount as createAccountRecord } from '../../../../endpoints/accounts/create-account/store'
import { saveAccountChanges } from '../../../../endpoints/accounts/update-account/store'
import { removeAccount as deleteAccountRecord } from '../../../../endpoints/accounts/delete-account/store'
import { Info, Pencil, Plus, Trash2 } from '@lucide/vue'
import { computed, ref } from 'vue'
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Button, DataTable, Input, TabsContent, toast } from '@obshaya/ui'
import { money, requestError } from '../format'

const accountSearch = ref('')
const accountDialogOpen = ref(false)
const editingAccount = ref<AccountRecord | null>(null)
const viewingAccount = ref<AccountRecord | null>(null)
const deletingAccount = ref<AccountRecord | null>(null)
const accountRows = useState('accounts', () => [] as AccountRecord[])
const visibleAccounts = computed(() => accountRows.value.filter(row => row.name.toLocaleLowerCase('ru').includes(accountSearch.value.trim().toLocaleLowerCase('ru'))))
const accountColumns = [
  { key: 'name', label: 'Название' },
  { key: 'amount', label: 'Сумма', align: 'right' as const },
  { key: 'actions', label: 'Действия', align: 'right' as const },
]
async function saveAccount(draft: { name: string }) {
  try {
    if (editingAccount.value) {
      await saveAccountChanges({ id: editingAccount.value.id, name: draft.name })
    } else {
      await createAccountRecord(draft)
    }
  } catch {
    toast.error('Не удалось сохранить счёт.')
    return
  }
  editingAccount.value = null
  accountDialogOpen.value = false
}

async function confirmDeleteAccount() {
  if (!deletingAccount.value) return
  try {
    await deleteAccountRecord({ id: deletingAccount.value.id })
    deletingAccount.value = null
  } catch (error) {
    toast.error(requestError(error, 'Не удалось удалить счёт.'))
  }
}

const { can, profile } = useEmployeeAccess()
</script>

<template>
  <TabsContent value="accounts" class="space-y-4">
    <div class="flex flex-wrap items-center gap-3">
      <Input v-model="accountSearch" class="max-w-xs" type="search" placeholder="Поиск по названию" aria-label="Поиск счёта" />
      <Button v-if="profile?.resources?.accounts == null" class="ml-auto" @click="editingAccount = null; accountDialogOpen = true"><Plus class="size-4" />Счёт</Button>
    </div>
    <DataTable :columns="accountColumns" :rows="visibleAccounts" :empty-text="accountSearch.trim() ? 'Совпадений не найдено' : 'Счетов пока нет'">
      <template #cell-amount="{ row }">{{ money(row.amount) }} сом</template>
      <template #cell-actions="{ row }">
        <div class="flex justify-end gap-1">
          <Button size="icon" variant="ghost" :aria-label="`Информация о счёте ${row.name}`" @click="viewingAccount = row"><Info class="size-4 text-sky-600" /></Button>
          <Button v-if="can('accounts.edit')" size="icon" variant="ghost" :aria-label="`Редактировать счёт ${row.name}`" @click="editingAccount = row; accountDialogOpen = true"><Pencil class="size-4 text-blue-600" /></Button>
          <Button v-if="can('accounts.delete')" size="icon" variant="ghost" :aria-label="`Удалить счёт ${row.name}`" @click="deletingAccount = row"><Trash2 class="size-4 text-destructive" /></Button>
        </div>
      </template>
    </DataTable>
  </TabsContent>

  <AccountFormDialog v-model:open="accountDialogOpen" :account="editingAccount" @save="saveAccount" />
  <AccountDetailsDialog v-if="viewingAccount" :account="viewingAccount" @close="viewingAccount = null" />
  <AlertDialog :open="!!deletingAccount" @update:open="open => { if (!open) deletingAccount = null }">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Удалить счёт?</AlertDialogTitle>
        <AlertDialogDescription>Счёт «{{ deletingAccount?.name }}» будет удалён.</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Отмена</AlertDialogCancel>
        <Button variant="destructive" @click="confirmDeleteAccount">Удалить</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
