<script setup lang="ts">
import WorkshopHeader from '~/features/shawarma/components/ShawarmaHeader.vue'
import PinPanel from './ShawarmaPinPanel.vue'
import LicensePanel from './ShawarmaLicensePanel.vue'
import UpdatePanel from './ShawarmaUpdatePanel.vue'
import ShawarmaArchivePanel from './ShawarmaArchivePanel.vue'
import ShawarmaBackupPanel from './ShawarmaBackupPanel.vue'
</script>

<template>
  <WorkshopHeader section="Управление шаурмичной" title="Настройки" description="Архив, резервные копии, PIN-код, лицензия и обновления шаурмичной." icon="settings">
    <div class="settings-grid">
      <ShawarmaArchivePanel />
      <PinPanel />
      <LicensePanel />
      <ShawarmaBackupPanel />
      <UpdatePanel />
    </div>
  </WorkshopHeader>
</template>

<style src="../assets/css/settings.css"></style>
