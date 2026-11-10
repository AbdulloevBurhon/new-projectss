CREATE TABLE IF NOT EXISTS activation_requests (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  app_version TEXT NOT NULL,
  product_id TEXT NOT NULL CHECK (product_id IN ('tsekh', 'shawarma')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at INTEGER NOT NULL,
  license_id TEXT
);
CREATE INDEX IF NOT EXISTS activation_requests_pending ON activation_requests(status, requested_at DESC);
CREATE INDEX IF NOT EXISTS activation_requests_device ON activation_requests(device_id, requested_at DESC);

CREATE TABLE IF NOT EXISTS licenses (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  product_id TEXT NOT NULL CHECK (product_id IN ('tsekh', 'shawarma')),
  client_name TEXT NOT NULL,
  activated_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'revoked')),
  UNIQUE (device_id, product_id)
);
CREATE INDEX IF NOT EXISTS licenses_product_status ON licenses(product_id, status, expires_at);

CREATE TABLE IF NOT EXISTS temporary_pins (
  id TEXT PRIMARY KEY,
  license_id TEXT NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);
CREATE INDEX IF NOT EXISTS temporary_pins_lookup ON temporary_pins(device_id, expires_at, used_at);
CREATE TABLE IF NOT EXISTS pin_attempts (
  device_id TEXT PRIMARY KEY,
  attempt_count INTEGER NOT NULL,
  window_started_at INTEGER NOT NULL,
  blocked_until INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  license_id TEXT NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('client', 'admin')),
  message TEXT NOT NULL,
  reply_to TEXT REFERENCES messages(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  read_at INTEGER
);
CREATE INDEX IF NOT EXISTS messages_license_time ON messages(license_id, created_at);
CREATE INDEX IF NOT EXISTS messages_unread ON messages(license_id, sender, read_at);

CREATE TABLE IF NOT EXISTS releases (
  product_id TEXT NOT NULL CHECK (product_id IN ('tsekh', 'shawarma')),
  version TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  file_name TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  sha256 TEXT NOT NULL,
  published_at INTEGER NOT NULL,
  published INTEGER NOT NULL DEFAULT 1 CHECK (published IN (0, 1)),
  all_clients INTEGER NOT NULL DEFAULT 1 CHECK (all_clients IN (0, 1)),
  PRIMARY KEY (product_id, version)
);
CREATE TABLE IF NOT EXISTS release_access (
  product_id TEXT NOT NULL,
  version TEXT NOT NULL,
  license_id TEXT NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, version, license_id),
  FOREIGN KEY (product_id, version) REFERENCES releases(product_id, version) ON DELETE CASCADE
);
