// GSTIN: 15 chars - 2 state + 10 PAN + 1 entity + 1 'Z' + 1 checksum
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function isValidGSTIN(value) {
  if (!value) return true; // optional
  return GSTIN_RE.test(String(value).trim().toUpperCase());
}

export function isValidPAN(value) {
  if (!value) return true;
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(String(value).trim().toUpperCase());
}

export function isValidPincode(value) {
  if (!value) return true;
  return /^[1-9][0-9]{5}$/.test(String(value).trim());
}

export function isValidEmail(value) {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isValidPhone(value) {
  if (!value) return true;
  return /^[+0-9\s()-]{7,}$/.test(value);
}
