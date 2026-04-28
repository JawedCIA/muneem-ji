-- 008_gst_returns.sql
-- Support GSTR-1 / GSTR-3B export:
--   * credit notes need to reference the original invoice (CDNR / CDNUR rows)
--   * GSTR-1 needs an explicit invoice "type" for the document series report (regular vs revised)
--     — for v1 we treat all sales as Regular, all credit notes as Type-5; no schema column needed.

ALTER TABLE invoices ADD COLUMN original_invoice_id TEXT REFERENCES invoices(id);
ALTER TABLE invoices ADD COLUMN original_invoice_no TEXT;
ALTER TABLE invoices ADD COLUMN original_invoice_date TEXT;

-- Default the B2CL threshold to ₹1,00,000 (current GSTN rule). Admin can override
-- under Settings → GST. Stored as a string for consistency with other settings.
INSERT OR IGNORE INTO settings (key, value) VALUES ('b2clThreshold', '100000');
