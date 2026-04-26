import { Router } from 'express';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import db from '../db/db.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/errorHandler.js';
import { audit } from '../utils/audit.js';
import { parsePagination, paginatedQuery } from '../utils/pagination.js';
import { assertNotLocked } from '../utils/periodLock.js';

const router = Router();

const paymentSchema = z.object({
  invoice_id: z.string().nullable().optional(),
  party_id: z.string().nullable().optional(),
  amount: z.coerce.number().positive(),
  date: z.string(),
  mode: z.enum(['cash', 'upi', 'card', 'netbanking', 'cheque', 'other']).default('cash'),
  reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

function recalcInvoice(invoiceId) {
  const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
  if (!inv) return;
  const paid = db.prepare('SELECT COALESCE(SUM(amount), 0) p FROM payments WHERE invoice_id = ?').get(invoiceId).p;
  let status = inv.status;
  if (inv.type !== 'quotation' && inv.status !== 'cancelled' && inv.status !== 'draft') {
    if (paid >= inv.total) status = 'paid';
    else if (paid > 0) status = 'partial';
    else {
      const today = new Date().toISOString().slice(0, 10);
      status = inv.due_date && inv.due_date < today ? 'overdue' : 'sent';
    }
  }
  db.prepare('UPDATE invoices SET amount_paid = ?, status = ?, updated_at = datetime(\'now\') WHERE id = ?').run(paid, status, invoiceId);
}

router.get('/', (req, res) => {
  const { invoice_id, party_id } = req.query;
  const where = [];
  const params = [];
  if (invoice_id) { where.push('p.invoice_id = ?'); params.push(invoice_id); }
  if (party_id) { where.push('p.party_id = ?'); params.push(party_id); }
  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const baseSql = `SELECT p.*, i.no AS invoice_no FROM payments p LEFT JOIN invoices i ON i.id = p.invoice_id`;
  const pag = parsePagination(req.query);
  res.json(paginatedQuery(db, baseSql, whereClause, 'ORDER BY p.date DESC', params, pag));
});

router.post('/', validate(paymentSchema), (req, res) => {
  assertNotLocked(req.body.date, 'record payment');
  // Also block paying against an invoice whose date is locked (changes amount_paid + status)
  if (req.body.invoice_id) {
    const inv = db.prepare('SELECT date FROM invoices WHERE id = ?').get(req.body.invoice_id);
    if (inv) assertNotLocked(inv.date, 'record payment against this invoice');
  }
  const id = nanoid(12);
  const partyId = req.body.party_id || (req.body.invoice_id
    ? db.prepare('SELECT party_id FROM invoices WHERE id = ?').get(req.body.invoice_id)?.party_id
    : null);
  db.transaction(() => {
    db.prepare(`INSERT INTO payments (id, invoice_id, party_id, amount, date, mode, reference, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
        id, req.body.invoice_id || null, partyId, req.body.amount, req.body.date,
        req.body.mode, req.body.reference || null, req.body.notes || null
      );
    if (req.body.invoice_id) recalcInvoice(req.body.invoice_id);
  })();
  const fresh = db.prepare('SELECT * FROM payments WHERE id = ?').get(id);
  const inv = fresh.invoice_id ? db.prepare('SELECT no FROM invoices WHERE id = ?').get(fresh.invoice_id) : null;
  audit.create(req, 'payment', fresh, `Recorded ${fresh.mode} payment of ₹${fresh.amount}${inv ? ` against ${inv.no}` : ''}`);
  res.status(201).json(fresh);
});

router.delete('/:id', (req, res) => {
  const before = db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.id);
  if (!before) throw new HttpError(404, 'Payment not found');
  assertNotLocked(before.date, 'delete payment');
  if (before.invoice_id) {
    const inv = db.prepare('SELECT date FROM invoices WHERE id = ?').get(before.invoice_id);
    if (inv) assertNotLocked(inv.date, 'delete payment for locked invoice');
  }
  db.transaction(() => {
    db.prepare('DELETE FROM payments WHERE id = ?').run(req.params.id);
    if (before.invoice_id) recalcInvoice(before.invoice_id);
  })();
  audit.delete(req, 'payment', before, `Removed ${before.mode} payment of ₹${before.amount}`);
  res.status(204).end();
});

export default router;
