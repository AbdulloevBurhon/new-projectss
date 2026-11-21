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
- `GET /clients`, `PATCH /clients/:id`, `DELETE /clients/:id`, `POST /clients/:id/temporary-pin` — licenses, access, expiry, cloud-archive permission and one-hour PIN reset.
- `GET /clients/:id/messages`, `POST /clients/:id/messages`, `DELETE /messages/:id` — client support chat and read receipts.
- `GET /notes`, `POST /notes`, `PATCH /notes/:id`, `DELETE /notes/:id` — admin notes.
- `GET /updates`, `POST /updates`, `PATCH /updates/:id`, `DELETE /updates/:id`, `GET /updates/:id/receipts`, `GET /updates/:id/download` — R2 update packages and client status.
- `GET /archives`, `GET /archives/:id/download`, `DELETE /archives/:id` — client archives.

Client routes use `X-Installation-Id` and `X-Client-Pin`; they cover activation, PIN checks, messages, update listing/download/receipts and JSON archive upload.

- `PUT /api/client/archives/latest` replaces the scheduled archive for the authenticated installation. It uses the existing D1 schema and R2 binding. `POST /api/client/archives` continues to create a separate manual archive. Both uploads are rejected when the license has cloud archives disabled.

## Current boundary

The admin UI and Tsekh clients use this Worker for activation, PIN, support messages, updates, cloud archives and Telegram. Inventory, sales and employee sessions are served by Tsekh's local API. See the [Tsekh project map](../../tsekh/STRUCTURE.md) and [admin guide](../../tsekh/docs/features/admin.md).

## Отправка отчётов «Цеха» в Telegram

Примените миграции D1 0007–0011, затем разверните Worker. Для выделенного бота задайте секреты `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` и имя `TELEGRAM_BOT_USERNAME` без @. Зарегистрируйте webhook Telegram методом `setWebhook` на `https://<адрес Worker>/api/telegram/webhook`. Передайте тот же `secret_token` и `allowed_updates: ["message"]`.

Клиент подтверждает номер и одобряет первую отправку с постоянным PIN. Оператор задаёт интервал в админке. Обновлённый «Цех» получает его через `GET /api/client/telegram/outbox` и отправляет сохранённый снимок через `POST` на тот же маршрут. Ключ выдаётся через `PUT /api/client/telegram/device` для одобренного получателя и действует при активной лицензии и разрешённой выгрузке. Worker отправляет JSON-бэкап файлом, отчёты текстом и сохраняет в D1 прогресс доставки частей комплекта. Интервал 0 запрещает плановую отправку. Клиентские ручные отправки сохраняют поддержку прежнего формата запросов.
