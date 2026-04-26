-- 003_pagination_indexes.sql
-- Sort indexes that keep list endpoints fast at scale (5K+ rows).
-- ORDER BY name is the default sort for parties + products lists.

CREATE INDEX IF NOT EXISTS idx_parties_name   ON parties(name);
CREATE INDEX IF NOT EXISTS idx_products_name  ON products(name);
CREATE INDEX IF NOT EXISTS idx_payments_date  ON payments(date);
