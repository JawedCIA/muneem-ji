-- 011_batch_expiry.sql
-- Per-line batch + expiry tracking for products that need it (pharmacy, food,
-- cosmetics, paint, lubricants). Batch is shared across the units in a single
-- line item; if the shop sells from two batches, they create two lines.

ALTER TABLE products ADD COLUMN has_batch INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN shelf_life_days INTEGER;

ALTER TABLE invoice_items ADD COLUMN batch_no TEXT;
ALTER TABLE invoice_items ADD COLUMN mfg_date TEXT;
ALTER TABLE invoice_items ADD COLUMN exp_date TEXT;

-- Drives the expiry register: "what's expiring in the next 30 days"
CREATE INDEX IF NOT EXISTS idx_items_exp_date ON invoice_items(exp_date);
CREATE INDEX IF NOT EXISTS idx_items_batch_no ON invoice_items(batch_no COLLATE NOCASE);
