# Tsekh structure map

- `app/pages/` owns routes and composes feature UI.
- `app/features/<section>/` owns only that section's UI, composables, instructions, and changelog.
- `endpoints/<domain>/` owns the client API adapter, endpoint state, and types in three files.
- Network implementation is intentionally unconfigured until the Worker API contract is connected.
- Feature modules must not import another feature's internals; shared reusable UI comes from `@obshaya/ui`.
  http://obshaya-programma-admin.burhon-2001-tjk.workers.dev/