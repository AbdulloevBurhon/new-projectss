# Access feature

- `components/PinEntry.vue` owns PIN entry and the support-message dialog.
- `composables/usePinAccess.ts` validates the temporary local demo PIN and manages the session cookie.
- The temporary PIN is `12345`; replace demo validation with the license/auth API before distribution.
- Support submission remains local until the Worker endpoint is implemented.
