// Public, unauthenticated routes for share-link access.
//
// Security model:
//   - Access is by 128-bit random token (server/db/migrations/007).
//   - Tokens leak via WhatsApp forwarding by design — same as Razorpay/Stripe pay links.
//   - Only safe-to-share fields are returned: invoice + items + a curated branding subset.
//     Internal settings (jwt_secret, backup paths, etc.) are NEVER exposed.
//   - Routes are read-only. No mutating actions are exposed publicly.

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import db from '../db/db.js';
import { HttpError } from '../middleware/errorHandler.js';

const router = Router();

// Per-IP cap on public lookups: a forwarded link should reach a few people, not get scraped.
const lookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

// Whitelist of settings keys that are safe to expose on a public invoice page.
// Anything not in this set stays server-side.
const PUBLIC_BRANDING_KEYS = new Set([
  'businessName', 'address', 'city', 'pincode', 'stateCode', 'stateName',
  'phone', 'email', 'website', 'gstin', 'pan', 'logoUrl', 'invoiceFooter',
  'gstEnabled',
]);

function getPublicBranding() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out = {};
  for (const r of rows) if (PUBLIC_BRANDING_KEYS.has(r.key)) out[r.key] = r.value;
  return out;
}

function loadByToken(token, expectedType) {
  if (!token || !/^[a-f0-9]{32}$/i.test(token)) return null;
  const inv = db.prepare('SELECT * FROM invoices WHERE share_token = ?').get(token);
  if (!inv) return null;
  if (expectedType === 'quotation' && inv.type !== 'quotation') return null;
  if (expectedType === 'invoice' && inv.type === 'quotation') return null;
  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order').all(inv.id);
  // Strip the share_token from the response — the recipient already has it in the URL,
  // and not echoing it back keeps server logs cleaner.
  const { share_token: _omit, ...safe } = inv;
  return { ...safe, items };
}

router.get('/invoice/:token', lookupLimiter, (req, res) => {
  const inv = loadByToken(req.params.token, 'invoice');
  if (!inv) throw new HttpError(404, 'Not found');
  res.json({ invoice: inv, branding: getPublicBranding() });
});

router.get('/quotation/:token', lookupLimiter, (req, res) => {
  const inv = loadByToken(req.params.token, 'quotation');
  if (!inv) throw new HttpError(404, 'Not found');
  res.json({ invoice: inv, branding: getPublicBranding() });
});

export default router;
