# Cloudflare API

Worker: `obshaya-programma-api`. Configuration and bindings are in `wrangler.jsonc`.

## Cloud resources

- D1 `tsekh4-licenses` is bound as `DB`.
- R2 `tsekh4-updates` is bound as `UPDATES_BUCKET` for EXE packages and client JSON archives.
- The Worker secret `ADMIN_API_KEY` protects every `/api/admin/*` route. Set it with Wrangler; never put it in source, `.dev.vars`, or the browser bundle.

## First deployment / schema updates

From this directory:

```powershell
npx wrangler secret put ADMIN_API_KEY --config wrangler.jsonc
npx wrangler d1 migrations apply tsekh4-licenses --remote --config wrangler.jsonc
npx wrangler deploy --config wrangler.jsonc
```

For local development, copy `.dev.vars.example` to `.dev.vars` and use a local-only secret. `.dev.vars` is ignored by Git.

The admin UI currently calls `https://obshaya-programma-api.burhon-2001-tjk.workers.dev`. Change `API_BASE` in `admin/admin-endpoints/core/admin-api.ts` if the deployed Worker URL differs.

## Admin API

All `/api/admin/*` routes require `Authorization: Bearer <ADMIN_API_KEY>`.

- `GET /requests`, `PATCH /requests/:id` — pending activation requests and approval/rejection.
- `GET /clients`, `PATCH /clients/:id`, `DELETE /clients/:id`, `POST /clients/:id/temporary-pin` — licenses, access, expiry and one-hour PIN reset.
- `GET /clients/:id/messages`, `POST /clients/:id/messages`, `DELETE /messages/:id` — client support chat and read receipts.
- `GET /notes`, `POST /notes`, `PATCH /notes/:id`, `DELETE /notes/:id` — admin notes.
- `GET /updates`, `POST /updates`, `PATCH /updates/:id`, `DELETE /updates/:id`, `GET /updates/:id/receipts`, `GET /updates/:id/download` — R2 update packages and client status.
- `GET /archives`, `GET /archives/:id/download`, `DELETE /archives/:id` — client archives.

Client routes use `X-Installation-Id` and `X-Client-Pin`; they cover activation, PIN checks, messages, update listing/download/receipts and JSON archive upload.

## Current boundary

The admin UI and API handlers are connected to D1/R2. The client endpoints are prepared, but the desktop/client activation, PIN, message, update and archive screens still need to call these endpoints before the complete end-to-end flow is live. Apply the migration and deploy the Worker only after reviewing the changes and setting the secret.
