-- 009_gst_optional.sql
-- Make GST a per-shop toggle. Existing installs default to enabled
-- (current behavior). New installs choose during setup wizard.
INSERT OR IGNORE INTO settings (key, value) VALUES ('gstEnabled', '1');
