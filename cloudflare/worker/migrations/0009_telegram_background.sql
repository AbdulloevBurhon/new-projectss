ALTER TABLE telegram_deliveries ADD COLUMN schedule_token_hash TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS telegram_schedule_token ON telegram_deliveries(schedule_token_hash) WHERE schedule_token_hash IS NOT NULL;
