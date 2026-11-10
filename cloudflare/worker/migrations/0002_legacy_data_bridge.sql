-- Keep the legacy tables intact while moving the active API to product-scoped records.
CREATE TABLE IF NOT EXISTS product_licenses (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  product_id TEXT NOT NULL CHECK (product_id IN ('tsekh', 'shawarma')),
  client_name TEXT NOT NULL,
  activated_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'revoked')),
  UNIQUE (device_id, product_id)
);
CREATE INDEX IF NOT EXISTS product_licenses_status ON product_licenses(product_id, status, expires_at);
INSERT OR IGNORE INTO product_licenses (id, device_id, product_id, client_name, activated_at, expires_at, status)
SELECT id, device_id, product_id, client_name, activated_at, expires_at, status FROM licenses;

CREATE TABLE messages_next (
  id TEXT PRIMARY KEY,
  license_id TEXT NOT NULL REFERENCES product_licenses(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('client', 'admin')),
  message TEXT NOT NULL,
  reply_to TEXT REFERENCES messages_next(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  read_at INTEGER
);
INSERT OR IGNORE INTO messages_next (id, license_id, sender, message, reply_to, created_at, read_at)
SELECT id, license_id, sender, message, reply_to, created_at, read_at FROM messages;
INSERT OR IGNORE INTO messages_next (id, license_id, sender, message, reply_to, created_at, read_at)
SELECT f.id, f.license_id, f.sender, f.message, f.reply_to, f.created_at, f.read_at
FROM client_feedback f JOIN product_licenses l ON l.id = f.license_id
WHERE f.client_cleared_at IS NULL;
DROP TABLE messages;
ALTER TABLE messages_next RENAME TO messages;
CREATE INDEX IF NOT EXISTS messages_license_time ON messages(license_id, created_at);
CREATE INDEX IF NOT EXISTS messages_unread ON messages(license_id, sender, read_at);

CREATE TABLE temporary_pins_next (
  id TEXT PRIMARY KEY,
  license_id TEXT NOT NULL REFERENCES product_licenses(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);
INSERT OR IGNORE INTO temporary_pins_next (id, license_id, device_id, pin_hash, expires_at, used_at)
SELECT p.id, p.license_id, p.device_id, p.pin_hash, p.expires_at, p.used_at
FROM temporary_pins p JOIN product_licenses l ON l.id = p.license_id;
DROP TABLE temporary_pins;
ALTER TABLE temporary_pins_next RENAME TO temporary_pins;
CREATE INDEX IF NOT EXISTS temporary_pins_lookup ON temporary_pins(device_id, expires_at, used_at);

ALTER TABLE releases ADD COLUMN object_key TEXT;
ALTER TABLE releases ADD COLUMN all_clients INTEGER NOT NULL DEFAULT 1 CHECK (all_clients IN (0, 1));
UPDATE releases SET object_key = file_key;
UPDATE releases SET all_clients = CASE
  WHEN EXISTS (SELECT 1 FROM release_grants g WHERE g.product_id = releases.product_id AND g.version = releases.version) THEN 0
  ELSE 1
END;

CREATE TABLE release_access_next (
  product_id TEXT NOT NULL,
  version TEXT NOT NULL,
  license_id TEXT NOT NULL REFERENCES product_licenses(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, version, license_id),
  FOREIGN KEY (product_id, version) REFERENCES releases(product_id, version) ON DELETE CASCADE
);
INSERT OR IGNORE INTO release_access_next (product_id, version, license_id)
SELECT product_id, version, license_id FROM release_access;
INSERT OR IGNORE INTO release_access_next (product_id, version, license_id)
SELECT g.product_id, g.version, g.license_id
FROM release_grants g JOIN product_licenses l ON l.id = g.license_id;
DROP TABLE release_access;
ALTER TABLE release_access_next RENAME TO release_access;
