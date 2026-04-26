-- 005_user_totp.sql
-- Add TOTP (RFC 6238) two-factor auth fields to users.
-- Each enrolled user gets a base32 secret + a JSON array of one-time backup codes.

ALTER TABLE users ADD COLUMN totp_secret TEXT;
ALTER TABLE users ADD COLUMN totp_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN totp_backup_codes TEXT; -- JSON array of unused 8-char codes (consumed on use)
