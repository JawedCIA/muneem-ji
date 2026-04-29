import { Router } from 'express';
import db from '../db/db.js';
import { parsePagination, paginatedQuery } from '../utils/pagination.js';

const router = Router();

function today() { return new Date().toISOString().slice(0, 10); }
function addDaysISO(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// status = active | expiring | expired | unknown
function statusFor(expDate) {
  if (!expDate) return 'unknown';
  const t = today();
  if (expDate < t) return 'expired';
  const soon = addDaysISO(30);
  if (expDate <= soon) return 'expiring';
  return 'active';
}

// We expose every invoice_item that has a batch_no — the shop can read it as
// "what we touched, with which batch and expiry". Sales (qty leaving) and
// purchases (qty incoming) both live here; the type column lets the UI badge.
const BASE_SQL = `
  SELECT it.id, it.batch_no, it.mfg_date, it.exp_date, it.qty, it.unit,
         it.product_id, p.name AS product_name, p.sku AS product_sku,
         i.id AS invoice_id, i.no AS invoice_no, i.date AS invoice_date, i.type AS invoice_type,
         i.party_name
  FROM invoice_items it
  JOIN products p ON p.id = it.product_id
  JOIN invoices i ON i.id = it.invoice_id
  WHERE it.batch_no IS NOT NULL AND it.batch_no <> ''`;

router.get('/', (req, res) => {
  const { q, status, product_id, type } = req.query;
  const where = [];
  const params = [];
  if (q) {
    where.push('(it.batch_no LIKE ? COLLATE NOCASE OR p.name LIKE ? OR i.no LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  if (product_id) { where.push('it.product_id = ?'); params.push(product_id); }
  if (type) { where.push('i.type = ?'); params.push(type); }
  if (status === 'expired')  { where.push('it.exp_date IS NOT NULL AND it.exp_date < ?'); params.push(today()); }
  if (status === 'active')   { where.push('it.exp_date IS NOT NULL AND it.exp_date > ?'); params.push(addDaysISO(30)); }
  if (status === 'expiring') {
    where.push('it.exp_date IS NOT NULL AND it.exp_date >= ? AND it.exp_date <= ?');
    params.push(today(), addDaysISO(30));
  }
  if (status === 'unknown') where.push('it.exp_date IS NULL');
  const whereClause = where.length ? 'AND ' + where.join(' AND ') : '';
  const pag = parsePagination(req.query);
  const result = paginatedQuery(
    db, BASE_SQL, whereClause,
    'ORDER BY (it.exp_date IS NULL) ASC, it.exp_date ASC, it.batch_no ASC',
    params, pag
  );
  if (Array.isArray(result)) {
    return res.json(result.map((r) => ({ ...r, status: statusFor(r.exp_date) })));
  }
  return res.json({ ...result, rows: result.rows.map((r) => ({ ...r, status: statusFor(r.exp_date) })) });
});

router.get('/stats', (req, res) => {
  const t = today();
  const soon = addDaysISO(30);
  const base = "FROM invoice_items WHERE batch_no IS NOT NULL AND batch_no <> ''";
  const total    = db.prepare(`SELECT COUNT(*) c ${base}`).get().c;
  const active   = db.prepare(`SELECT COUNT(*) c ${base} AND exp_date IS NOT NULL AND exp_date > ?`).get(soon).c;
  const expiring = db.prepare(`SELECT COUNT(*) c ${base} AND exp_date IS NOT NULL AND exp_date >= ? AND exp_date <= ?`).get(t, soon).c;
  const expired  = db.prepare(`SELECT COUNT(*) c ${base} AND exp_date IS NOT NULL AND exp_date < ?`).get(t).c;
  const unknown  = db.prepare(`SELECT COUNT(*) c ${base} AND exp_date IS NULL`).get().c;
  res.json({ total, active, expiring, expired, unknown });
});

export default router;
