-- 001_initial.sql — initial schema (extracted from server/db/schema.sql)
-- Foreign keys & WAL pragmas are set in db.js before this runs.
-- IMPORTANT: never edit an applied migration in place. Add a new file (002, 003...) instead.

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'cashier' CHECK(role IN ('admin', 'cashier')),
  active        INTEGER NOT NULL DEFAULT 1,
  last_login_at TEXT,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS parties (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK(type IN ('customer', 'supplier')),
  email       TEXT,
  phone       TEXT,
  gstin       TEXT,
  address     TEXT,
  city        TEXT,
  pincode     TEXT,
  state_code  TEXT,
  state_name  TEXT,
  opening_bal REAL DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  sku         TEXT UNIQUE,
  category    TEXT,
  description TEXT,
  hsn_code    TEXT,
  unit        TEXT DEFAULT 'Nos',
  sale_price  REAL NOT NULL DEFAULT 0,
  buy_price   REAL DEFAULT 0,
  tax_rate    REAL DEFAULT 18,
  stock       REAL DEFAULT 0,
  min_stock   REAL DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id          TEXT PRIMARY KEY,
  product_id  TEXT NOT NULL REFERENCES products(id),
  qty         REAL NOT NULL,
  type        TEXT CHECK(type IN ('purchase', 'sale', 'adjustment', 'return')),
  reason      TEXT,
  ref_id      TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS invoices (
  id           TEXT PRIMARY KEY,
  no           TEXT NOT NULL UNIQUE,
  type         TEXT NOT NULL CHECK(type IN ('sale', 'purchase', 'quotation', 'credit_note')),
  date         TEXT NOT NULL,
  due_date     TEXT,
  party_id     TEXT REFERENCES parties(id),
  party_name   TEXT,
  interstate   INTEGER DEFAULT 0,
  subtotal     REAL DEFAULT 0,
  discount     REAL DEFAULT 0,
  cgst_total   REAL DEFAULT 0,
  sgst_total   REAL DEFAULT 0,
  igst_total   REAL DEFAULT 0,
  total        REAL DEFAULT 0,
  amount_paid  REAL DEFAULT 0,
  status       TEXT DEFAULT 'draft'
               CHECK(status IN ('draft','sent','paid','partial','overdue','cancelled','accepted','rejected','expired')),
  notes        TEXT,
  created_at   TEXT DEFAULT (datetime('now')),
  updated_at   TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id          TEXT PRIMARY KEY,
  invoice_id  TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id  TEXT REFERENCES products(id),
  name        TEXT NOT NULL,
  hsn_code    TEXT,
  qty         REAL NOT NULL DEFAULT 1,
  unit        TEXT DEFAULT 'Nos',
  rate        REAL NOT NULL DEFAULT 0,
  tax_rate    REAL DEFAULT 18,
  taxable_amt REAL DEFAULT 0,
  tax_amt     REAL DEFAULT 0,
  total       REAL DEFAULT 0,
  sort_order  INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS payments (
  id          TEXT PRIMARY KEY,
  invoice_id  TEXT REFERENCES invoices(id),
  party_id    TEXT REFERENCES parties(id),
  amount      REAL NOT NULL,
  date        TEXT NOT NULL,
  mode        TEXT DEFAULT 'cash'
              CHECK(mode IN ('cash','upi','card','netbanking','cheque','other')),
  reference   TEXT,
  notes       TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS expenses (
  id          TEXT PRIMARY KEY,
  date        TEXT NOT NULL,
  category    TEXT NOT NULL,
  description TEXT,
  vendor      TEXT,
  amount      REAL NOT NULL,
  payment_mode TEXT DEFAULT 'cash',
  receipt_path TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_invoices_party    ON invoices(party_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date     ON invoices(date);
CREATE INDEX IF NOT EXISTS idx_invoices_status   ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_type     ON invoices(type);
CREATE INDEX IF NOT EXISTS idx_items_invoice     ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice  ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_party    ON payments(party_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date     ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_stock_product     ON stock_movements(product_id);
