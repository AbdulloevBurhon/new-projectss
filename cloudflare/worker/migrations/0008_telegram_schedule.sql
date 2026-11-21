ALTER TABLE telegram_deliveries ADD COLUMN interval_minutes INTEGER NOT NULL DEFAULT 0 CHECK(interval_minutes BETWEEN 0 AND 10080);
ALTER TABLE telegram_deliveries ADD COLUMN next_at INTEGER;
ALTER TABLE telegram_deliveries ADD COLUMN last_sent_at INTEGER;
