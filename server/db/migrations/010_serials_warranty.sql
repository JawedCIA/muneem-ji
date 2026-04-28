-- 010_serials_warranty.sql
-- Per-unit serial / IMEI tracking for products that need it (electronics,
-- mobile, jewellery, auto parts). Also records warranty period at time of
-- sale so the shop can answer "is this AC still under warranty?" instantly.

ALTER TABLE products ADD COLUMN has_serial INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN warranty_months INTEGER;

CREATE TABLE IF NOT EXISTS item_serials (
  id              TEXT PRIMARY KEY,
  serial          TEXT NOT NULL,
  product_id      TEXT NOT NULL REFERENCES products(id),
  invoice_id      TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  invoice_item_id TEXT NOT NULL REFERENCES invoice_items(id) ON DELETE CASCADE,
  party_id        TEXT REFERENCES parties(id),
  sold_date       TEXT NOT NULL,
  warranty_months INTEGER,
  warranty_until  TEXT,
  notes           TEXT,
  created_at      TEXT DEFAULT (datetime('now'))
);

-- Lookup by serial — the most common query (service intake "scan serial")
CREATE INDEX IF NOT EXISTS idx_serials_serial    ON item_serials(serial COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_serials_product   ON item_serials(product_id);
CREATE INDEX IF NOT EXISTS idx_serials_invoice   ON item_serials(invoice_id);
CREATE INDEX IF NOT EXISTS idx_serials_party     ON item_serials(party_id);
CREATE INDEX IF NOT EXISTS idx_serials_warranty  ON item_serials(warranty_until);
