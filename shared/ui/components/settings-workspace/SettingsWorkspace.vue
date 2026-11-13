<script setup lang="ts">
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import PinSettingsCard from './cards/PinSettingsCard.vue'
import ProgramUpdateCard from './cards/ProgramUpdateCard.vue'
import DataArchiveCard from './cards/DataArchiveCard.vue'

withDefaults(defineProps<{
  productName: string
  currentVersion?: string
  online?: boolean
  pinLength?: number
  cloudCopyEnabled?: boolean
  uploadingArchive?: boolean
  updateAvailable?: { id: string; version: string; note: string } | null
}>(), { currentVersion: '0.1.0', online: false, pinLength: 5, cloudCopyEnabled: false, uploadingArchive: false })

const emit = defineEmits<{
  changePin: [pin: string]
  checkUpdates: []
  exportData: []
  importData: [file: File]
  toggleCloudCopy: [enabled: boolean]
  downloadUpdate: [id: string]
}>()
</script>

<template>
  <main class="w-full p-5 text-slate-900 sm:p-8">
    <header class="mb-6">
      <h1 class="mt-2 text-3xl font-semibold tracking-tight">Настройки</h1>
    </header>

    <Tabs default-value="details" class="mt-6 w-full gap-5">
      <TabsList class="h-11 w-fit flex-wrap justify-start gap-0.5 rounded-xl bg-muted p-1.5">
        <TabsTrigger value="details" class="h-9 flex-none rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">Детали</TabsTrigger>
      </TabsList>
      <TabsContent value="details" class="mt-0">
        <section class="grid auto-rows-fr items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Карточки настроек">
          <PinSettingsCard :product-name="productName" :pin-length="pinLength" @save="pin => emit('changePin', pin)" />
          <ProgramUpdateCard :current-version="currentVersion" :online="online" :update-available="updateAvailable" @check="emit('checkUpdates')" @download="id => emit('downloadUpdate', id)" />
          <DataArchiveCard :online="online" :cloud-copy-enabled="cloudCopyEnabled" :uploading="uploadingArchive" @export="emit('exportData')" @import="file => emit('importData', file)" @toggle-cloud-copy="enabled => emit('toggleCloudCopy', enabled)" />
        </section>
      </TabsContent>
    </Tabs>
  </main>
</template>
