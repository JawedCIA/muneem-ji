-- 006_bank_reconciliation.sql
-- Bank reconciliation: import bank statements (CSV), match each line against
-- a payment or expense, mark reconciled.
--
-- Model:
--   bank_accounts          — the shop's bank accounts (one row per account)
--   bank_statement_lines   — each row from an imported CSV
--   reconciliation_matches — links a statement_line to a payment or expense
--
-- Reconciled = a statement_line has a row in reconciliation_matches.
-- A line can be matched to multiple internal records (rare splits) and vice versa,
-- but for v1 the UI only allows 1:1 matches.

CREATE TABLE IF NOT EXISTS bank_accounts (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,             -- "HDFC Current 1234"
  bank_name    TEXT,
  account_no   TEXT,                      -- masked (last 4) or full — owner's choice
  currency     TEXT DEFAULT 'INR',
  opening_bal  REAL DEFAULT 0,
  notes        TEXT,
  created_at   TEXT DEFAULT (datetime('now')),
  updated_at   TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bank_statement_lines (
  id              TEXT PRIMARY KEY,
  account_id      TEXT NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  date            TEXT NOT NULL,           -- ISO date of the transaction
  description     TEXT,                    -- raw description from the bank
  reference       TEXT,                    -- cheque no, UTR, etc.
  debit           REAL DEFAULT 0,          -- money OUT (expense / supplier payment)
  credit          REAL DEFAULT 0,          -- money IN (customer payment received)
  balance         REAL,                    -- running balance from the bank, optional
  imported_at     TEXT DEFAULT (datetime('now')),
  source_file     TEXT,                    -- filename of the CSV it came from
  raw_row         TEXT                     -- JSON of the original CSV row, for debugging
);

CREATE INDEX IF NOT EXISTS idx_bsl_account  ON bank_statement_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_bsl_date     ON bank_statement_lines(date);

CREATE TABLE IF NOT EXISTS reconciliation_matches (
  id            TEXT PRIMARY KEY,
  line_id       TEXT NOT NULL REFERENCES bank_statement_lines(id) ON DELETE CASCADE,
  match_type    TEXT NOT NULL CHECK(match_type IN ('payment', 'expense')),
  payment_id    TEXT REFERENCES payments(id),
  expense_id    TEXT REFERENCES expenses(id),
  matched_by    TEXT,                      -- user_id who matched
  matched_at    TEXT DEFAULT (datetime('now')),
  notes         TEXT
);

CREATE INDEX IF NOT EXISTS idx_recmatch_line     ON reconciliation_matches(line_id);
CREATE INDEX IF NOT EXISTS idx_recmatch_payment  ON reconciliation_matches(payment_id);
CREATE INDEX IF NOT EXISTS idx_recmatch_expense  ON reconciliation_matches(expense_id);
