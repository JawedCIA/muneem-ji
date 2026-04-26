// Period-lock guard.
//
// Once an accountant has filed GSTR-1 for (say) March 2026, they cannot have
// anyone editing March invoices in May. The owner sets `lockBeforeDate` in
// Settings (e.g. 2026-03-31) and any mutation against an entry whose `date`
// is on or before that bound is refused with HTTP 423 (Locked).
//
// ISO-8601 date strings (YYYY-MM-DD) compare lexicographically — same result
// as a date comparison, no parsing needed.

import db from '../db/db.js';
import { HttpError } from '../middleware/errorHandler.js';

export function getLockBeforeDate() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'lockBeforeDate'").get();
  const v = row?.value;
  return v && v.trim() ? v : null;
}

export function isDateLocked(date, lock = getLockBeforeDate()) {
  if (!lock || !date) return false;
  return String(date) <= String(lock);
}

/**
 * Throws HttpError(423) if the date(s) fall inside the locked period.
 * Pass any number of dates — useful for updates where the existing date
 * AND the new date both must be unlocked (can't move an entry into or out
 * of the locked period).
 */
export function assertNotLocked(dates, action = 'modify') {
  const lock = getLockBeforeDate();
  if (!lock) return;
  const arr = (Array.isArray(dates) ? dates : [dates]).filter(Boolean);
  for (const d of arr) {
    if (isDateLocked(d, lock)) {
      throw new HttpError(
        423,
        `Cannot ${action}: this entry's date (${d}) is on or before the lock date (${lock}). ` +
        `Unlock the period in Settings → Tax Settings to make changes.`
      );
    }
  }
}
