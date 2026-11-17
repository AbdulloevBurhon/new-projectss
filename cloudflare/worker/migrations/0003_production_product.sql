-- Extend product constraints while retaining all licenses and related records.
-- Build a second set of tables so foreign keys stay enabled throughout the migration.

CREATE TABLE app_activation_requests_next (
  id TEXT PRIMARY KEY,
  installation_id TEXT NOT NULL,
  product TEXT NOT NULL CHECK (product IN ('tsekh', 'shawarma', 'production')),
  client_name TEXT NOT NULL DEFAULT '',
  app_version TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  license_days INTEGER NOT NULL DEFAULT 365 CHECK (license_days > 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decided_at TEXT
);

CREATE TABLE app_licenses_next (
  id TEXT PRIMARY KEY,
  installation_id TEXT NOT NULL UNIQUE,
  product TEXT NOT NULL CHECK (product IN ('tsekh', 'shawarma', 'production')),
  client_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'removed')),
  license_from TEXT NOT NULL,
  license_until TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  temporary_pin_hash TEXT,
  temporary_pin_expires_at TEXT,
  current_version TEXT NOT NULL DEFAULT '0.1.0',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  initial_pin TEXT
);

CREATE TABLE app_updates_next (
  id TEXT PRIMARY KEY,
  product TEXT NOT NULL CHECK (product IN ('tsekh', 'shawarma', 'production')),
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

CREATE TABLE app_messages_next (
  id TEXT PRIMARY KEY,
  license_id TEXT NOT NULL REFERENCES app_licenses_next(id),
  sender TEXT NOT NULL CHECK (sender IN ('client', 'admin')),
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 1000),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'read')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE app_update_receipts_next (
  update_id TEXT NOT NULL REFERENCES app_updates_next(id),
  license_id TEXT NOT NULL REFERENCES app_licenses_next(id),
  downloaded_at TEXT,
  installed_at TEXT,
  PRIMARY KEY(update_id, license_id)
);

CREATE TABLE app_archives_next (
  id TEXT PRIMARY KEY,
  license_id TEXT NOT NULL REFERENCES app_licenses_next(id),
  object_key TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO app_activation_requests_next SELECT * FROM app_activation_requests;
INSERT INTO app_licenses_next SELECT * FROM app_licenses;
INSERT INTO app_updates_next SELECT * FROM app_updates;
INSERT INTO app_messages_next SELECT * FROM app_messages;
INSERT INTO app_update_receipts_next SELECT * FROM app_update_receipts;
INSERT INTO app_archives_next SELECT * FROM app_archives;

DROP TABLE app_archives;
DROP TABLE app_update_receipts;
DROP TABLE app_messages;
DROP TABLE app_updates;
DROP TABLE app_licenses;
DROP TABLE app_activation_requests;

ALTER TABLE app_activation_requests_next RENAME TO app_activation_requests;
ALTER TABLE app_licenses_next RENAME TO app_licenses;
ALTER TABLE app_updates_next RENAME TO app_updates;
ALTER TABLE app_messages_next RENAME TO app_messages;
ALTER TABLE app_update_receipts_next RENAME TO app_update_receipts;
ALTER TABLE app_archives_next RENAME TO app_archives;

CREATE INDEX app_requests_status_created ON app_activation_requests(status, created_at DESC);
CREATE INDEX app_requests_installation ON app_activation_requests(installation_id, created_at DESC);
CREATE INDEX app_licenses_status_product ON app_licenses(status, product);
CREATE INDEX app_messages_license_created ON app_messages(license_id, created_at);
CREATE INDEX app_archives_license_created ON app_archives(license_id, created_at DESC);
