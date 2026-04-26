import { Router } from 'express';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import db from '../db/db.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/errorHandler.js';
import { audit } from '../utils/audit.js';
import { parsePagination, paginatedQuery } from '../utils/pagination.js';

const router = Router();

const partySchema = z.object({
  name: z.string().min(1, 'Name required'),
  type: z.enum(['customer', 'supplier']),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  phone: z.string().optional().nullable(),
  gstin: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  pincode: z.string().optional().nullable(),
  state_code: z.string().optional().nullable(),
  state_name: z.string().optional().nullable(),
  opening_bal: z.coerce.number().optional().default(0),
});

// Optional fields are stored as nullable in SQLite. better-sqlite3 named-bind
// requires every @field to exist on the object — so undefined → null.
const PARTY_FIELDS = ['email', 'phone', 'gstin', 'address', 'city', 'pincode', 'state_code', 'state_name'];
function normalizeParty(body) {
  const out = { ...body };
  for (const k of PARTY_FIELDS) if (out[k] === undefined) out[k] = null;
  if (out.opening_bal === undefined) out.opening_bal = 0;
  return out;
}

function partyOutstanding(partyId) {
  const row = db.prepare(`
    SELECT COALESCE(SUM(total - amount_paid), 0) AS outstanding
    FROM invoices
    WHERE party_id = ? AND type = 'sale' AND status NOT IN ('cancelled', 'draft')
  `).get(partyId);
  const opening = db.prepare('SELECT opening_bal FROM parties WHERE id = ?').get(partyId)?.opening_bal || 0;
  return Number(row.outstanding || 0) + Number(opening || 0);
}

router.get('/', (req, res) => {
  const { type, q } = req.query;
  const where = [];
  const params = [];
  if (type) { where.push('type = ?'); params.push(type); }
  if (q) {
    where.push('(name LIKE ? OR gstin LIKE ? OR phone LIKE ?)');
    const pat = `%${q}%`;
    params.push(pat, pat, pat);
  }
  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const pag = parsePagination(req.query);
  const result = paginatedQuery(db, 'SELECT * FROM parties', whereClause, 'ORDER BY name', params, pag);
  // enrich with outstanding for both shapes
  if (Array.isArray(result)) {
    res.json(result.map((p) => ({ ...p, outstanding: partyOutstanding(p.id) })));
  } else {
    res.json({ ...result, rows: result.rows.map((p) => ({ ...p, outstanding: partyOutstanding(p.id) })) });
  }
});

router.get('/:id', (req, res) => {
  const party = db.prepare('SELECT * FROM parties WHERE id = ?').get(req.params.id);
  if (!party) throw new HttpError(404, 'Party not found');
  const invoices = db.prepare(`SELECT * FROM invoices WHERE party_id = ? ORDER BY date DESC`).all(req.params.id);
  const payments = db.prepare(`SELECT * FROM payments WHERE party_id = ? ORDER BY date DESC`).all(req.params.id);
  res.json({ ...party, outstanding: partyOutstanding(req.params.id), invoices, payments });
});

router.post('/', validate(partySchema), (req, res) => {
  const id = nanoid(12);
  const p = normalizeParty({ id, ...req.body });
  db.prepare(`INSERT INTO parties
    (id, name, type, email, phone, gstin, address, city, pincode, state_code, state_name, opening_bal)
    VALUES (@id, @name, @type, @email, @phone, @gstin, @address, @city, @pincode, @state_code, @state_name, @opening_bal)`).run(p);
  const fresh = db.prepare('SELECT * FROM parties WHERE id = ?').get(id);
  audit.create(req, 'party', fresh, `Added ${p.type} ${p.name}`);
  res.status(201).json(fresh);
});

router.put('/:id', validate(partySchema), (req, res) => {
  const before = db.prepare('SELECT * FROM parties WHERE id = ?').get(req.params.id);
  if (!before) throw new HttpError(404, 'Party not found');
  const p = normalizeParty({ id: req.params.id, ...req.body });
  db.prepare(`UPDATE parties SET
    name=@name, type=@type, email=@email, phone=@phone, gstin=@gstin,
    address=@address, city=@city, pincode=@pincode, state_code=@state_code,
    state_name=@state_name, opening_bal=@opening_bal, updated_at=datetime('now')
    WHERE id=@id`).run(p);
  const after = db.prepare('SELECT * FROM parties WHERE id = ?').get(req.params.id);
  audit.update(req, 'party', before, after, `Updated party ${after.name}`);
  res.json(after);
});

router.delete('/:id', (req, res) => {
  const before = db.prepare('SELECT * FROM parties WHERE id = ?').get(req.params.id);
  if (!before) throw new HttpError(404, 'Party not found');
  const invCount = db.prepare('SELECT COUNT(*) c FROM invoices WHERE party_id = ?').get(req.params.id).c;
  const payCount = db.prepare('SELECT COUNT(*) c FROM payments WHERE party_id = ?').get(req.params.id).c;
  if (invCount > 0 || payCount > 0) {
    throw new HttpError(409, `Cannot delete: party has ${invCount} invoice(s) and ${payCount} payment(s) on record. Edit the party instead.`);
  }
  db.prepare('DELETE FROM parties WHERE id = ?').run(req.params.id);
  audit.delete(req, 'party', before, `Deleted party ${before.name}`);
  res.status(204).end();
});

export default router;
