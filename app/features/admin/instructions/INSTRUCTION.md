# Admin feature

- The admin API is configured by `NUXT_PUBLIC_LICENSE_API_BASE` and lives under `/api/v1/admin`.
- Sign in with the Worker secret `ADMIN_KEY`; the Worker returns a short-lived bearer token. The browser keeps that token in session storage until logout or tab close.
- D1 records requests, one license per device and product, temporary PIN resets, messages, and release access.
- R2 stores release binaries. A hidden release remains in history but cannot be downloaded by clients.
- Never add Cloudflare secrets or private signing keys to frontend code or this folder.
