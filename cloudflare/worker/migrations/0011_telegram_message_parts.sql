ALTER TABLE telegram_outbox_deliveries ADD COLUMN sent_parts INTEGER NOT NULL DEFAULT 0
  CHECK(sent_parts >= 0);
