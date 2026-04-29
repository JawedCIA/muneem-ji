-- 012_feature_flags.sql
-- Per-shop feature toggles. Each setting is '1' (on) or '0' (off), matching
-- the gstEnabled convention. Defaults reflect what an existing install has
-- actually been doing — if a shop already has serials, it stays on. Fresh
-- installs get a sensible "general retail" default; the setup wizard's
-- shop-type chooser overwrites these in one go.

-- feature.serials — auto-on if any serial has been recorded
INSERT OR IGNORE INTO settings (key, value)
SELECT 'feature.serials', CASE WHEN COUNT(*) > 0 THEN '1' ELSE '0' END FROM item_serials;

-- feature.batches — auto-on if any invoice line has a batch_no
INSERT OR IGNORE INTO settings (key, value)
SELECT 'feature.batches', CASE WHEN COUNT(*) > 0 THEN '1' ELSE '0' END
FROM invoice_items WHERE batch_no IS NOT NULL AND batch_no <> '';

-- feature.recurring — auto-on if any recurring template exists
INSERT OR IGNORE INTO settings (key, value)
SELECT 'feature.recurring', CASE WHEN COUNT(*) > 0 THEN '1' ELSE '0' END FROM recurring_invoices;

-- feature.banking — auto-on if a bank account is configured
INSERT OR IGNORE INTO settings (key, value)
SELECT 'feature.banking', CASE WHEN COUNT(*) > 0 THEN '1' ELSE '0' END FROM bank_accounts;

-- feature.pos / feature.quotations — default ON; most retail shops use both.
-- Service-only or wholesale-only shops can switch them off in Settings.
INSERT OR IGNORE INTO settings (key, value) VALUES ('feature.pos', '1');
INSERT OR IGNORE INTO settings (key, value) VALUES ('feature.quotations', '1');
