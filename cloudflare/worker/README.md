# Cloudflare Worker

Worker API for product activation, license administration, client messages, and product-scoped releases. D1 stores metadata; R2 stores installer files.

## Existing production secrets

The Worker is deployed under the existing `tsekh4-license-api` name so Cloudflare keeps its existing secrets. The new Worker accepts the legacy binding names below; secret values stay in Cloudflare and are never copied into the repository:

- `ADMIN_API_KEY` — administrator sign-in key.
- `LICENSE_SIGNING_PRIVATE_KEY` — PKCS#8 PEM private ECDSA P-256 key. It must match the public key embedded in `app/features/license/services/public-key.ts`.

Set `ALLOWED_ORIGINS` to include the exact deployed frontend origin when the new Nuxt admin is hosted. Local Nuxt origins are currently allowed.

## Deploy steps

From the project root, the existing D1 database and R2 bucket are already bound in Wrangler:

```powershell
npx wrangler d1 migrations apply tsekh4-licenses --remote --config cloudflare/worker/wrangler.jsonc
npx wrangler deploy --config cloudflare/worker/wrangler.jsonc
```

The existing frontend default points to this same Worker URL.

The migration copies legacy license, message, and release-access rows into product-scoped tables; old tables remain intact as a rollback/archive source. Hiding a release disables future downloads while preserving its R2 file.
Jv7O0X7UA7dfjSIxdYuUzoEbqaMzQTIdATyis53eoFo
