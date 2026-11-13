PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS app_activation_requests (
  id TEXT PRIMARY KEY,
  installation_id TEXT NOT NULL,
  product TEXT NOT NULL CHECK (product IN ('tsekh', 'shawarma')),
  client_name TEXT NOT NULL DEFAULT '',
  app_version TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  license_days INTEGER NOT NULL DEFAULT 365 CHECK (license_days > 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decided_at TEXT
);

CREATE INDEX IF NOT EXISTS app_requests_status_created ON app_activation_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS app_requests_installation ON app_activation_requests(installation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS app_licenses (
  id TEXT PRIMARY KEY,
  installation_id TEXT NOT NULL UNIQUE,
  product TEXT NOT NULL CHECK (product IN ('tsekh', 'shawarma')),
  client_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'removed')),
  license_from TEXT NOT NULL,
  license_until TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  temporary_pin_hash TEXT,
  temporary_pin_expires_at TEXT,
  current_version TEXT NOT NULL DEFAULT '0.1.0',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS app_licenses_status_product ON app_licenses(status, product);

CREATE TABLE IF NOT EXISTS app_messages (
  id TEXT PRIMARY KEY,
  license_id TEXT NOT NULL REFERENCES app_licenses(id),
  sender TEXT NOT NULL CHECK (sender IN ('client', 'admin')),
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 1000),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'read')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS app_messages_license_created ON app_messages(license_id, created_at);

CREATE TABLE IF NOT EXISTS app_notes (
  id TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  amount TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_updates (
  id TEXT PRIMARY KEY,
  product TEXT NOT NULL CHECK (product IN ('tsekh', 'shawarma')),
  name TEXT NOT NULL DEFAULT '',
  version TEXT NOT NULL,
  file_name TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
  sha256 TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  available INTEGER NOT NULL DEFAULT 1 CHECK (available IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(product, version)
);

CREATE TABLE IF NOT EXISTS app_update_receipts (
  update_id TEXT NOT NULL REFERENCES app_updates(id),
  license_id TEXT NOT NULL REFERENCES app_licenses(id),
  downloaded_at TEXT,
  installed_at TEXT,
  PRIMARY KEY(update_id, license_id)
);

CREATE TABLE IF NOT EXISTS app_archives (
  id TEXT PRIMARY KEY,
  license_id TEXT NOT NULL REFERENCES app_licenses(id),
  object_key TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS app_archives_license_created ON app_archives(license_id, created_at DESC);
