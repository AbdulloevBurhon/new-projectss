<script setup lang="ts">
defineProps<{ name: string }>()

const paths: Record<string, string> = {
  logo: 'M3 8 12 3l9 5v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Zm4 13v-8h10v8m-10-4h10',
  warehouses: 'M3 9 12 4l9 5v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Zm4 11v-7h10v7m-10-3.5h10',
  workers: 'M15 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.9M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM17 3.2a4 4 0 0 1 0 7.6',
  products: 'm12 3 9 5-9 5-9-5 9-5ZM3 8v8l9 5 9-5V8m-9 5v8M7.5 5.5l9 5',
  techcards: 'M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2m-8-2h8v4H8zm0 9h8m-8 4h5',
  balance: 'M4 19V5m0 14h16M9 15v-4m5 4V8m5 7V4',
  accounts: 'M20 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6m19 6h-5a2 2 0 0 0 0 4h5',
  sales: 'M3 4h2l2.6 11h11l2.4-8H6m3.5 13h.01m7.99 0h.01',
  clients: 'M4 4h16v16H4zm4 12a4 4 0 0 1 8 0M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  minus: 'M5 12h14',
  receipts: 'M12 3v12m-4-4 4 4 4-4M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4',
  history: 'M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5m4 0v4l3 2',
  plus: 'M12 5v14M5 12h14',
  search: 'M10.5 17a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13Zm5-2 4.5 4.5',
  edit: 'm15 5 4 4M4 20l4.5-1 11-11a2.8 2.8 0 0 0-4-4l-11 11L4 20Z',
  trash: 'M3 6h18M9 6V3h6v3M6 6l1 14h10l1-14m-8 4v6m4-6v6',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-11v5m0-8h.01',
  close: 'm6 6 12 12M18 6 6 18',
  chevron: 'm9 6 6 6-6 6',
  check: 'm5 12 4 4L19 6',
  reset: 'M3 11a9 9 0 1 1 2 7m-2-7V5m0 6h6',
  settings: 'M4 7h16M4 17h16M9 4v6m6 4v6',
  upload: 'M12 16V4m-4 4 4-4 4 4M4 15v5h16v-5',
  save: 'M5 3h12l4 4v14H3V3zm2 0v6h10V3M7 21v-8h10v8',
  eye: 'M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
}
</script>

<template>
  <svg class="inventory-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path :d="paths[name]" />
  </svg>
</template>
