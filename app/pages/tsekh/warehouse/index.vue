<script setup lang="ts">
import TsekhShell from '~/features/tsekh/layouts/TsekhShell.vue'
import WarehouseShell from '~/features/tsekh/warehouse/components/WarehouseShell.vue'
import CatalogPage from '~/features/tsekh/warehouse/components/CatalogPage.vue'
</script>
<template><TsekhShell><WarehouseShell><CatalogPage catalog="warehouses" /></WarehouseShell></TsekhShell></template>
