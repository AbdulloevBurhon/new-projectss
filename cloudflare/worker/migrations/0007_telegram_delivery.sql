CREATE TABLE telegram_deliveries (
  license_id TEXT PRIMARY KEY REFERENCES app_licenses(id) ON DELETE CASCADE,
  ticket TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  chat_id TEXT,
  state TEXT NOT NULL CHECK(state IN ('pending','verified','sending','sent','unknown')),
  expires_at INTEGER NOT NULL
);
CREATE INDEX telegram_delivery_chat ON telegram_deliveries(chat_id, state);
