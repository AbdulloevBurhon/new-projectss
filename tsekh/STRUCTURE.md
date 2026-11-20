# Tsekh structure map

- `app/pages/` owns routes and composes feature UI.
- `app/features/<section>/` owns only that section's UI, composables, instructions, and changelog.
- `endpoints/<feature>/<operation>/` contains the types, service, and store for each operation. Existing endpoint groups are `access/license`, `settings/updates`, `support/messages`, and `warehouse/`.
- Warehouse operations use browser storage. The license, updates, and messages folders contain endpoint scaffolding.
  - Feature modules must not import another feature's internals; shared reusable UI comes from `@obshaya/ui`.
       http://obshaya-programma-admin.burhon-2001-tjk.workers.dev/
