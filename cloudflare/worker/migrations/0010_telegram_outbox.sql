ALTER TABLE app_licenses ADD COLUMN telegram_interval_minutes INTEGER
  CHECK(telegram_interval_minutes BETWEEN 0 AND 10080);

CREATE TABLE telegram_outbox_deliveries (
  license_id TEXT NOT NULL REFERENCES app_licenses(id) ON DELETE CASCADE,
  ticket TEXT NOT NULL,
  job_id TEXT NOT NULL,
  sent_files INTEGER NOT NULL DEFAULT 0,
  lease_until INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (license_id, ticket, job_id)
);
