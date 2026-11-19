CREATE TABLE IF NOT EXISTS app_activation_messages (
  id TEXT PRIMARY KEY,
  installation_id TEXT NOT NULL,
  product TEXT NOT NULL,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 1000),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS app_activation_messages_created
ON app_activation_messages(created_at DESC);
