ALTER TABLE app_licenses
ADD COLUMN cloud_archive_allowed INTEGER NOT NULL DEFAULT 1 CHECK (cloud_archive_allowed IN (0, 1));
