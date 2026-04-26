-- 007_share_tokens.sql
-- Public-share token for invoices and quotations.
-- A 32-hex-char token is the URL slug (~128 bits) for the unauthenticated
-- public viewer page (/i/:token, /q/:token). Tokens are issued on insert
-- and rotated only if the user explicitly revokes a share.

ALTER TABLE invoices ADD COLUMN share_token TEXT;

-- Backfill existing rows with random tokens. SQLite's randomblob(16) gives 16 bytes;
-- hex() encodes them as 32 lowercase hex chars.
UPDATE invoices SET share_token = lower(hex(randomblob(16))) WHERE share_token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_share_token ON invoices(share_token);
