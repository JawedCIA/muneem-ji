// RFC 6238 TOTP / RFC 4226 HOTP implementation. Pure Node, no external deps.
// Compatible with Google Authenticator, Authy, 1Password, Microsoft Authenticator, etc.

import crypto from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;
const DIGITS = 6;

/** Generate a fresh 20-byte secret encoded as base32 (160 bits — RFC 6238 recommended) */
export function generateSecret() {
  const bytes = crypto.randomBytes(20);
  return base32Encode(bytes);
}

export function base32Encode(buf) {
  let bits = 0, value = 0, output = '';
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

export function base32Decode(str) {
  const cleaned = str.replace(/=+$/, '').replace(/\s/g, '').toUpperCase();
  let bits = 0, value = 0;
  const out = [];
  for (const ch of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx < 0) throw new Error('Invalid base32 char: ' + ch);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function hotp(secret, counter) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24)
             | ((hmac[offset + 1] & 0xff) << 16)
             | ((hmac[offset + 2] & 0xff) << 8)
             |  (hmac[offset + 3] & 0xff);
  return String(code % (10 ** DIGITS)).padStart(DIGITS, '0');
}

export function generateTOTP(secretBase32, ts = Date.now()) {
  const secret = base32Decode(secretBase32);
  return hotp(secret, Math.floor(ts / 1000 / STEP_SECONDS));
}

/**
 * Verify a user-entered code against a secret. Allows ±1 step (30s window before/after)
 * to forgive small clock drift.
 *
 * Returns true on match, false otherwise.
 */
export function verifyTOTP(secretBase32, code, ts = Date.now()) {
  if (!code || !/^\d{6}$/.test(String(code))) return false;
  const secret = base32Decode(secretBase32);
  const counter = Math.floor(ts / 1000 / STEP_SECONDS);
  for (const offset of [-1, 0, 1]) {
    const candidate = hotp(secret, counter + offset);
    if (timingSafeEqualStr(candidate, String(code))) return true;
  }
  return false;
}

function timingSafeEqualStr(a, b) {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/** Build the otpauth:// URI that authenticator apps scan as a QR code. */
export function buildOtpAuthUri({ secret, accountName, issuer = 'Muneem Ji' }) {
  const enc = encodeURIComponent;
  const label = `${enc(issuer)}:${enc(accountName)}`;
  const params = new URLSearchParams({
    secret, issuer, algorithm: 'SHA1', digits: String(DIGITS), period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params}`;
}

/** Generate N one-time recovery codes (8 chars each, alphanumeric, easy to read) */
export function generateBackupCodes(n = 8) {
  const codes = [];
  for (let i = 0; i < n; i++) {
    const buf = crypto.randomBytes(5);
    let s = base32Encode(buf).slice(0, 8); // 8 base32 chars
    codes.push(s);
  }
  return codes;
}
