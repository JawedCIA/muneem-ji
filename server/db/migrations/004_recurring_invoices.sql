-- 004_recurring_invoices.sql
-- Templates that auto-generate real invoices on a cadence (weekly/monthly/quarterly/yearly).
-- The hourly scheduler in server/utils/recurringScheduler.js picks up rows whose
-- next_run_date <= today and status='active', generates an invoice, then advances next_run_date.

CREATE TABLE IF NOT EXISTS recurring_invoices (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,                -- "Monthly retainer — Acme"
  party_id            TEXT REFERENCES parties(id),
  party_name          TEXT,
  items_json          TEXT NOT NULL,                -- serialized items array (same shape as invoice POST)
  discount            REAL DEFAULT 0,
  notes               TEXT,
  cadence             TEXT NOT NULL CHECK(cadence IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  cadence_n           INTEGER NOT NULL DEFAULT 1,   -- "every N units" (e.g. cadence=monthly cadence_n=3 = every 3 months)
  start_date          TEXT NOT NULL,                -- ISO date when the schedule begins
  next_run_date       TEXT NOT NULL,                -- ISO date when the next invoice is due to be generated
  end_date            TEXT,                         -- nullable; if set, no runs after this date
  status              TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'paused', 'ended')),
  autosend            INTEGER NOT NULL DEFAULT 0,   -- if 1, generated invoice is created with status='sent', else 'draft'
  last_invoice_id     TEXT,                         -- id of most recently generated invoice (nullable)
  last_run_at         TEXT,                         -- timestamp of most recent successful run
  run_count           INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT DEFAULT (datetime('now')),
  updated_at          TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_recurring_next_run ON recurring_invoices(next_run_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_recurring_party    ON recurring_invoices(party_id);
CREATE INDEX IF NOT EXISTS idx_recurring_status   ON recurring_invoices(status);
