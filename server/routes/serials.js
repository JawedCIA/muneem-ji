import { Router } from 'express';
import db from '../db/db.js';
import { HttpError } from '../middleware/errorHandler.js';
import { parsePagination, paginatedQuery } from '../utils/pagination.js';

const router = Router();

// today() in YYYY-MM-DD
function today() { return new Date().toISOString().slice(0, 10); }
function addDaysISO(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// status = active | expiring | expired | unknown
function statusFor(warrantyUntil) {
  if (!warrantyUntil) return 'unknown';
  const t = today();
  if (warrantyUntil < t) return 'expired';
  const soon = addDaysISO(30);
  if (warrantyUntil <= soon) return 'expiring';
  return 'active';
}

const BASE_SQL = `
  SELECT s.*, p.name AS product_name, p.sku AS product_sku,
         i.no AS invoice_no, i.date AS invoice_date,
         party.name AS party_name, party.phone AS party_phone
  FROM item_serials s
  JOIN products p   ON p.id = s.product_id
  JOIN invoices i   ON i.id = s.invoice_id
  LEFT JOIN parties party ON party.id = s.party_id`;

router.get('/', (req, res) => {
  const { q, status, product_id } = req.query;
  const where = [];
  const params = [];
  if (q) {
    // Match on serial OR product name OR party name OR invoice no
    where.push('(s.serial LIKE ? COLLATE NOCASE OR p.name LIKE ? OR party.name LIKE ? OR i.no LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  if (product_id) { where.push('s.product_id = ?'); params.push(product_id); }
  if (status === 'expired') { where.push('s.warranty_until IS NOT NULL AND s.warranty_until < ?'); params.push(today()); }
  if (status === 'active')  { where.push('s.warranty_until IS NOT NULL AND s.warranty_until >= ?'); params.push(today()); }
  if (status === 'expiring') {
    where.push('s.warranty_until IS NOT NULL AND s.warranty_until >= ? AND s.warranty_until <= ?');
    params.push(today(), addDaysISO(30));
  }
  if (status === 'unknown') where.push('s.warranty_until IS NULL');
  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const pag = parsePagination(req.query);
  const result = paginatedQuery(db, BASE_SQL, whereClause, 'ORDER BY s.sold_date DESC, s.serial ASC', params, pag);
  if (Array.isArray(result)) {
    return res.json(result.map((r) => ({ ...r, status: statusFor(r.warranty_until) })));
  }
  return res.json({ ...result, rows: result.rows.map((r) => ({ ...r, status: statusFor(r.warranty_until) })) });
});

router.get('/lookup/:serial', (req, res) => {
  const row = db.prepare(`${BASE_SQL} WHERE s.serial = ? COLLATE NOCASE LIMIT 1`).get(req.params.serial);
  if (!row) throw new HttpError(404, 'Serial not found');
  res.json({ ...row, status: statusFor(row.warranty_until) });
});

router.get('/stats', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) c FROM item_serials').get().c;
  const t = today();
  const soon = addDaysISO(30);
  const active = db.prepare('SELECT COUNT(*) c FROM item_serials WHERE warranty_until IS NOT NULL AND warranty_until >= ?').get(t).c;
  const expiring = db.prepare('SELECT COUNT(*) c FROM item_serials WHERE warranty_until IS NOT NULL AND warranty_until >= ? AND warranty_until <= ?').get(t, soon).c;
  const expired = db.prepare('SELECT COUNT(*) c FROM item_serials WHERE warranty_until IS NOT NULL AND warranty_until < ?').get(t).c;
  const unknown = db.prepare('SELECT COUNT(*) c FROM item_serials WHERE warranty_until IS NULL').get().c;
  res.json({ total, active, expiring, expired, unknown });
});

export default router;
