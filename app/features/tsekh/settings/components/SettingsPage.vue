<script setup lang="ts">
import WorkshopHeader from '~/features/tsekh/components/WorkshopHeader.vue'
import ArchivePanel from './ArchivePanel.vue'
import BackupPanel from './BackupPanel.vue'
import PinPanel from './PinPanel.vue'
import LicensePanel from './LicensePanel.vue'
import UpdatePanel from './UpdatePanel.vue'
import { useBackupRuntime } from '../composables/useBackupRuntime'

useBackupRuntime()
</script>

<template>
  <WorkshopHeader section="Управление цехом" title="Настройки" description="Архив данных, резервные копии и доступ к приложению." icon="settings">
    <div class="settings-grid">
      <ArchivePanel />
      <PinPanel />
      <LicensePanel />
      <BackupPanel />
      <UpdatePanel />
    </div>
  </WorkshopHeader>
</template>

<style src="../assets/settings.css"></style>
