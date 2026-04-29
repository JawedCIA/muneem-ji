import { Router } from 'express';
import crypto from 'node:crypto';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import db from '../db/db.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/errorHandler.js';
import { calcInvoice, isInterstate } from '../utils/gstCalc.js';
import { audit, recordAudit } from '../utils/audit.js';
import { parsePagination, paginatedQuery } from '../utils/pagination.js';
import { assertNotLocked } from '../utils/periodLock.js';

const router = Router();

const itemSchema = z.object({
  product_id: z.string().nullable().optional(),
  name: z.string().min(1),
  hsn_code: z.string().optional().nullable(),
  qty: z.coerce.number(),
  unit: z.string().optional().default('Nos'),
  rate: z.coerce.number(),
  tax_rate: z.coerce.number().optional().default(18),
  serials: z.array(z.string()).optional(),
  batch_no: z.string().optional().nullable(),
  mfg_date: z.string().optional().nullable(),
  exp_date: z.string().optional().nullable(),
});

const invoiceSchema = z.object({
  no: z.string().optional(),
  type: z.enum(['sale', 'purchase', 'quotation', 'credit_note']).default('sale'),
  date: z.string(),
  due_date: z.string().optional().nullable(),
  party_id: z.string().nullable().optional(),
  party_name: z.string().optional().nullable(),
  interstate: z.union([z.boolean(), z.number()]).optional(),
  discount: z.coerce.number().optional().default(0),
  status: z.enum(['draft','sent','paid','partial','overdue','cancelled','accepted','rejected','expired']).default('draft'),
  notes: z.string().optional().nullable(),
  original_invoice_id: z.string().nullable().optional(),
  original_invoice_no: z.string().nullable().optional(),
  original_invoice_date: z.string().nullable().optional(),
  items: z.array(itemSchema).min(1, 'At least one line item required'),
});

const statusSchema = z.object({
  status: z.enum(['draft','sent','paid','partial','overdue','cancelled','accepted','rejected','expired']),
});

function getBusinessStateCode() {
  const r = db.prepare("SELECT value FROM settings WHERE key = 'stateCode'").get();
  return r?.value || '27';
}

function getPrefix(type) {
  const key = type === 'quotation' ? 'quotationPrefix' : 'invoicePrefix';
  const def = type === 'quotation' ? 'QUO' : 'INV';
  const r = db.prepare(`SELECT value FROM settings WHERE key = ?`).get(key);
  return r?.value || def;
}

function nextInvoiceNo(type) {
  const prefix = getPrefix(type);
  const count = db.prepare("SELECT COUNT(*) c FROM invoices WHERE type = ?").get(type).c;
  let n = count + 1;
  while (db.prepare('SELECT 1 FROM invoices WHERE no = ?').get(`${prefix}-${String(n).padStart(3, '0')}`)) n++;
  return `${prefix}-${String(n).padStart(3, '0')}`;
}

function newShareToken() {
  return crypto.randomBytes(16).toString('hex');
}

// Compute warranty_until = sold_date + months. Stays null if either is missing.
function addMonthsISO(dateISO, months) {
  if (!dateISO || !months) return null;
  const d = new Date(`${dateISO}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  d.setUTCMonth(d.getUTCMonth() + Number(months));
  return d.toISOString().slice(0, 10);
}

// Validate the per-line serials for sale invoices: products with has_serial=1
// require exactly qty distinct serials, and serials must be unique across the invoice.
function validateSerials(items, type) {
  if (type !== 'sale') return; // only sales emit serials
  const seen = new Set();
  for (const it of items) {
    if (!it.product_id) continue;
    const p = db.prepare('SELECT has_serial, name FROM products WHERE id = ?').get(it.product_id);
    if (!p?.has_serial) continue;
    const serials = (it.serials || []).map((s) => String(s).trim()).filter(Boolean);
    if (serials.length !== Number(it.qty)) {
      throw new HttpError(400, `${p.name}: expected ${it.qty} serial number(s), got ${serials.length}`);
    }
    for (const s of serials) {
      const key = s.toLowerCase();
      if (seen.has(key)) throw new HttpError(400, `Duplicate serial in invoice: ${s}`);
      seen.add(key);
    }
  }
}

// Validate batch fields when product.has_batch=1: batch_no required, exp_date required.
// Applied to both sales and purchases — pharmacy needs batch on incoming stock too.
function validateBatches(items) {
  for (const it of items) {
    if (!it.product_id) continue;
    const p = db.prepare('SELECT has_batch, name FROM products WHERE id = ?').get(it.product_id);
    if (!p?.has_batch) continue;
    if (!it.batch_no || !String(it.batch_no).trim()) {
      throw new HttpError(400, `${p.name}: batch number required`);
    }
    if (!it.exp_date || !/^\d{4}-\d{2}-\d{2}$/.test(it.exp_date)) {
      throw new HttpError(400, `${p.name}: expiry date required (YYYY-MM-DD)`);
    }
    if (it.mfg_date && !/^\d{4}-\d{2}-\d{2}$/.test(it.mfg_date)) {
      throw new HttpError(400, `${p.name}: invalid manufacturing date`);
    }
    if (it.mfg_date && it.exp_date < it.mfg_date) {
      throw new HttpError(400, `${p.name}: expiry date is before manufacturing date`);
    }
  }
}

function persistSerials(invoiceId, partyId, soldDate, items, lineIds) {
  if (!items || !items.length) return;
  // Wipe and re-insert (idempotent for PUT). Cascade on invoice delete handles the create case too.
  db.prepare('DELETE FROM item_serials WHERE invoice_id = ?').run(invoiceId);
  const ins = db.prepare(`INSERT INTO item_serials
    (id, serial, product_id, invoice_id, invoice_item_id, party_id, sold_date, warranty_months, warranty_until)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  items.forEach((it, idx) => {
    if (!it.product_id || !it.serials?.length) return;
    const p = db.prepare('SELECT has_serial, warranty_months FROM products WHERE id = ?').get(it.product_id);
    if (!p?.has_serial) return;
    const months = p.warranty_months ?? null;
    const warrantyUntil = addMonthsISO(soldDate, months);
    for (const raw of it.serials) {
      const serial = String(raw).trim();
      if (!serial) continue;
      ins.run(nanoid(12), serial, it.product_id, invoiceId, lineIds[idx], partyId || null, soldDate, months, warrantyUntil);
    }
  });
}

function syncStock(invoiceId, items, type, status, direction) {
  // direction = -1 for deduct (sale), +1 for restore
  if (type !== 'sale') return;
  if (['draft', 'cancelled'].includes(status)) return;
  const upd = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
  const insMv = db.prepare('INSERT INTO stock_movements (id, product_id, qty, type, reason, ref_id) VALUES (?, ?, ?, ?, ?, ?)');
  items.forEach((it) => {
    if (it.product_id) {
      upd.run(direction * it.qty, it.product_id);
      insMv.run(nanoid(12), it.product_id, direction * it.qty, direction < 0 ? 'sale' : 'return', `Invoice sync`, invoiceId);
    }
  });
}

function computeStatus(invoice, paid) {
  if (invoice.status === 'cancelled') return 'cancelled';
  if (invoice.type === 'quotation') return invoice.status;
  if (paid >= invoice.total) return 'paid';
  if (paid > 0 && paid < invoice.total) return 'partial';
  if (invoice.due_date) {
    const today = new Date().toISOString().slice(0, 10);
    if (invoice.due_date < today && paid < invoice.total && invoice.status !== 'draft') return 'overdue';
  }
  return invoice.status === 'draft' ? 'draft' : 'sent';
}

function fullInvoice(id) {
  const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
  if (!inv) return null;
  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order').all(id);
  const payments = db.prepare('SELECT * FROM payments WHERE invoice_id = ? ORDER BY date DESC').all(id);
  // Attach serials per line item (electronics / mobile / appliance shops)
  const serialRows = db.prepare(
    'SELECT serial, invoice_item_id, warranty_until FROM item_serials WHERE invoice_id = ? ORDER BY serial'
  ).all(id);
  const byLine = new Map();
  for (const s of serialRows) {
    const arr = byLine.get(s.invoice_item_id) || [];
    arr.push(s.serial);
    byLine.set(s.invoice_item_id, arr);
  }
  for (const it of items) {
    it.serials = byLine.get(it.id) || [];
  }
  return { ...inv, items, payments };
}

router.get('/', (req, res) => {
  const { type, status, from, to, party, q } = req.query;
  const where = [];
  const params = [];
  if (type) { where.push('type = ?'); params.push(type); }
  if (status) { where.push('status = ?'); params.push(status); }
  if (from) { where.push('date >= ?'); params.push(from); }
  if (to) { where.push('date <= ?'); params.push(to); }
  if (party) { where.push('party_id = ?'); params.push(party); }
  if (q) { where.push('(no LIKE ? OR party_name LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const pag = parsePagination(req.query);
  res.json(paginatedQuery(db, 'SELECT * FROM invoices', whereClause, 'ORDER BY date DESC, no DESC', params, pag));
});

router.get('/:id', (req, res) => {
  const inv = fullInvoice(req.params.id);
  if (!inv) throw new HttpError(404, 'Invoice not found');
  res.json(inv);
});

router.post('/', validate(invoiceSchema), (req, res) => {
  const body = req.body;
  assertNotLocked(body.date, 'create entry');
  validateSerials(body.items, body.type);
  validateBatches(body.items);
  const businessState = getBusinessStateCode();
  let interstate = !!body.interstate;
  if (body.party_id) {
    const p = db.prepare('SELECT state_code FROM parties WHERE id = ?').get(body.party_id);
    if (p && body.interstate === undefined) interstate = isInterstate(p.state_code, businessState);
  }
  const calc = calcInvoice({ items: body.items, discount: body.discount, interstate });
  const id = nanoid(12);
  const no = body.no || nextInvoiceNo(body.type);
  const partyName = body.party_name || (body.party_id ? db.prepare('SELECT name FROM parties WHERE id = ?').get(body.party_id)?.name : null);
  const inv = {
    id, no, type: body.type,
    date: body.date,
    due_date: body.due_date || null,
    party_id: body.party_id || null,
    party_name: partyName,
    interstate: interstate ? 1 : 0,
    subtotal: calc.subtotal,
    discount: calc.discount,
    cgst_total: calc.cgst_total,
    sgst_total: calc.sgst_total,
    igst_total: calc.igst_total,
    total: calc.total,
    amount_paid: 0,
    status: body.status,
    notes: body.notes || null,
    share_token: newShareToken(),
    original_invoice_id: body.type === 'credit_note' ? (body.original_invoice_id || null) : null,
    original_invoice_no: body.type === 'credit_note' ? (body.original_invoice_no || null) : null,
    original_invoice_date: body.type === 'credit_note' ? (body.original_invoice_date || null) : null,
  };
  db.transaction(() => {
    db.prepare(`INSERT INTO invoices
      (id, no, type, date, due_date, party_id, party_name, interstate, subtotal, discount, cgst_total, sgst_total, igst_total, total, amount_paid, status, notes, share_token, original_invoice_id, original_invoice_no, original_invoice_date)
      VALUES (@id, @no, @type, @date, @due_date, @party_id, @party_name, @interstate, @subtotal, @discount, @cgst_total, @sgst_total, @igst_total, @total, @amount_paid, @status, @notes, @share_token, @original_invoice_id, @original_invoice_no, @original_invoice_date)`).run(inv);
    const lineIds = [];
    calc.items.forEach((it, i) => {
      const lineId = nanoid(12);
      lineIds.push(lineId);
      db.prepare(`INSERT INTO invoice_items
        (id, invoice_id, product_id, name, hsn_code, qty, unit, rate, tax_rate, taxable_amt, tax_amt, total, sort_order, batch_no, mfg_date, exp_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
          lineId, id, it.product_id || null, it.name, it.hsn_code || null,
          it.qty, it.unit || 'Nos', it.rate, it.tax_rate, it.taxable_amt, it.tax_amt, it.total, i,
          it.batch_no || null, it.mfg_date || null, it.exp_date || null
        );
    });
    persistSerials(id, inv.party_id, inv.date, body.items, lineIds);
    syncStock(id, calc.items, inv.type, inv.status, -1);
  })();
  const fresh = fullInvoice(id);
  audit.create(req, 'invoice', fresh, `Created ${inv.type} ${fresh.no} for ${fresh.party_name || 'Walk-in'} (₹${fresh.total})`);
  res.status(201).json(fresh);
});

router.put('/:id', validate(invoiceSchema), (req, res) => {
  const existing = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  if (!existing) throw new HttpError(404, 'Invoice not found');
  // Block edit if either the existing or the new date sits inside the locked period
  assertNotLocked([existing.date, req.body.date], 'edit invoice');
  const oldItems = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(req.params.id);
  validateSerials(req.body.items, req.body.type);
  validateBatches(req.body.items);
  const body = req.body;
  const businessState = getBusinessStateCode();
  let interstate = !!body.interstate;
  if (body.party_id && body.interstate === undefined) {
    const p = db.prepare('SELECT state_code FROM parties WHERE id = ?').get(body.party_id);
    if (p) interstate = isInterstate(p.state_code, businessState);
  }
  const calc = calcInvoice({ items: body.items, discount: body.discount, interstate });
  const partyName = body.party_name || (body.party_id ? db.prepare('SELECT name FROM parties WHERE id = ?').get(body.party_id)?.name : null);
  db.transaction(() => {
    syncStock(req.params.id, oldItems, existing.type, existing.status, +1);
    db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(req.params.id);
    const inv = {
      id: req.params.id,
      no: body.no || existing.no,
      type: body.type,
      date: body.date,
      due_date: body.due_date || null,
      party_id: body.party_id || null,
      party_name: partyName,
      interstate: interstate ? 1 : 0,
      subtotal: calc.subtotal,
      discount: calc.discount,
      cgst_total: calc.cgst_total,
      sgst_total: calc.sgst_total,
      igst_total: calc.igst_total,
      total: calc.total,
      status: body.status,
      notes: body.notes || null,
      original_invoice_id: body.type === 'credit_note' ? (body.original_invoice_id || null) : null,
      original_invoice_no: body.type === 'credit_note' ? (body.original_invoice_no || null) : null,
      original_invoice_date: body.type === 'credit_note' ? (body.original_invoice_date || null) : null,
    };
    db.prepare(`UPDATE invoices SET
      no=@no, type=@type, date=@date, due_date=@due_date, party_id=@party_id, party_name=@party_name,
      interstate=@interstate, subtotal=@subtotal, discount=@discount, cgst_total=@cgst_total,
      sgst_total=@sgst_total, igst_total=@igst_total, total=@total, status=@status, notes=@notes,
      original_invoice_id=@original_invoice_id, original_invoice_no=@original_invoice_no,
      original_invoice_date=@original_invoice_date,
      updated_at=datetime('now') WHERE id=@id`).run(inv);
    const lineIds = [];
    calc.items.forEach((it, i) => {
      const lineId = nanoid(12);
      lineIds.push(lineId);
      db.prepare(`INSERT INTO invoice_items
        (id, invoice_id, product_id, name, hsn_code, qty, unit, rate, tax_rate, taxable_amt, tax_amt, total, sort_order, batch_no, mfg_date, exp_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
          lineId, req.params.id, it.product_id || null, it.name, it.hsn_code || null,
          it.qty, it.unit || 'Nos', it.rate, it.tax_rate, it.taxable_amt, it.tax_amt, it.total, i,
          it.batch_no || null, it.mfg_date || null, it.exp_date || null
        );
    });
    persistSerials(req.params.id, inv.party_id, inv.date, body.items, lineIds);
    syncStock(req.params.id, calc.items, inv.type, inv.status, -1);
    // Recalculate paid + status
    const paid = db.prepare('SELECT COALESCE(SUM(amount), 0) p FROM payments WHERE invoice_id = ?').get(req.params.id).p;
    const newStatus = computeStatus({ ...inv, total: calc.total, type: inv.type }, paid);
    db.prepare('UPDATE invoices SET amount_paid = ?, status = ? WHERE id = ?').run(paid, newStatus, req.params.id);
  })();
  const after = fullInvoice(req.params.id);
  audit.update(req, 'invoice', { ...existing, items: oldItems }, after, `Edited ${after.type} ${after.no}`);
  res.json(after);
});

router.delete('/:id', (req, res) => {
  const before = fullInvoice(req.params.id);
  if (!before) throw new HttpError(404, 'Invoice not found');
  assertNotLocked(before.date, 'delete invoice');
  const oldItems = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(req.params.id);
  db.transaction(() => {
    syncStock(req.params.id, oldItems, before.type, before.status, +1);
    db.prepare('DELETE FROM payments WHERE invoice_id = ?').run(req.params.id);
    db.prepare('DELETE FROM invoices WHERE id = ?').run(req.params.id);
  })();
  audit.delete(req, 'invoice', before, `Deleted ${before.type} ${before.no} for ${before.party_name || 'Walk-in'} (₹${before.total})`);
  res.status(204).end();
});

router.patch('/:id/status', validate(statusSchema), (req, res) => {
  const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  if (!inv) throw new HttpError(404, 'Invoice not found');
  assertNotLocked(inv.date, 'change status of invoice');
  const oldStatus = inv.status;
  const newStatus = req.body.status;
  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(req.params.id);
  db.transaction(() => {
    const wasActive = inv.type === 'sale' && !['draft', 'cancelled'].includes(oldStatus);
    const willBeActive = inv.type === 'sale' && !['draft', 'cancelled'].includes(newStatus);
    if (wasActive && !willBeActive) syncStock(inv.id, items, 'sale', 'sent', +1);
    if (!wasActive && willBeActive) syncStock(inv.id, items, 'sale', 'sent', -1);
    db.prepare('UPDATE invoices SET status = ?, updated_at = datetime(\'now\') WHERE id = ?').run(newStatus, req.params.id);
  })();
  recordAudit({
    req, action: 'status_change', entity: 'invoice', entityId: inv.id,
    before: { status: oldStatus }, after: { status: newStatus },
    summary: `${inv.no} status: ${oldStatus} → ${newStatus}`,
  });
  res.json(fullInvoice(req.params.id));
});

router.post('/:id/convert', (req, res) => {
  const quotation = fullInvoice(req.params.id);
  if (!quotation) throw new HttpError(404, 'Quotation not found');
  if (quotation.type !== 'quotation') throw new HttpError(400, 'Only quotations can be converted');
  const newId = nanoid(12);
  const newNo = nextInvoiceNo('sale');
  db.transaction(() => {
    db.prepare(`INSERT INTO invoices
      (id, no, type, date, due_date, party_id, party_name, interstate, subtotal, discount, cgst_total, sgst_total, igst_total, total, status, notes, share_token)
      SELECT ?, ?, 'sale', date('now'), date('now', '+15 day'), party_id, party_name, interstate, subtotal, discount, cgst_total, sgst_total, igst_total, total, 'draft', notes, ?
      FROM invoices WHERE id = ?`).run(newId, newNo, newShareToken(), req.params.id);
    quotation.items.forEach((it, i) => {
      db.prepare(`INSERT INTO invoice_items
        (id, invoice_id, product_id, name, hsn_code, qty, unit, rate, tax_rate, taxable_amt, tax_amt, total, sort_order, batch_no, mfg_date, exp_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
          nanoid(12), newId, it.product_id, it.name, it.hsn_code, it.qty, it.unit, it.rate, it.tax_rate, it.taxable_amt, it.tax_amt, it.total, i,
          it.batch_no || null, it.mfg_date || null, it.exp_date || null
        );
    });
    db.prepare('UPDATE invoices SET status = ? WHERE id = ?').run('accepted', req.params.id);
  })();
  const fresh = fullInvoice(newId);
  recordAudit({
    req, action: 'convert', entity: 'invoice', entityId: newId,
    before: { quotationNo: quotation.no, quotationId: quotation.id },
    after: { invoiceNo: fresh.no, invoiceId: fresh.id },
    summary: `Converted quotation ${quotation.no} → invoice ${fresh.no}`,
  });
  res.status(201).json(fresh);
});

// Records that the user shared this invoice (used for audit + future analytics).
// Does not regenerate the token — the same token can be re-shared.
const shareLogSchema = z.object({
  channel: z.enum(['whatsapp', 'email', 'sms', 'link']).default('whatsapp'),
  to: z.string().optional().nullable(),
});
router.post('/:id/share', validate(shareLogSchema), (req, res) => {
  const inv = db.prepare('SELECT id, no, type, party_name, total, share_token FROM invoices WHERE id = ?').get(req.params.id);
  if (!inv) throw new HttpError(404, 'Invoice not found');
  // Backfill: legacy rows from before migration 007 may have NULL token (defensive)
  if (!inv.share_token) {
    inv.share_token = newShareToken();
    db.prepare('UPDATE invoices SET share_token = ? WHERE id = ?').run(inv.share_token, inv.id);
  }
  recordAudit({
    req, action: 'share', entity: 'invoice', entityId: inv.id,
    after: { channel: req.body.channel, to: req.body.to || null, no: inv.no },
    summary: `Shared ${inv.type} ${inv.no} via ${req.body.channel}${req.body.to ? ` to ${req.body.to}` : ''}`,
  });
  res.json({ ok: true, share_token: inv.share_token });
});

export default router;
