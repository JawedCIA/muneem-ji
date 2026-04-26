import { Router } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import db from '../db/db.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/errorHandler.js';
import { calcInvoice, isInterstate } from '../utils/gstCalc.js';
import { audit, recordAudit } from '../utils/audit.js';
import { advanceDate, todayISO, shouldEnd } from '../utils/recurring.js';
import { parsePagination, paginatedQuery } from '../utils/pagination.js';

const router = Router();

const itemSchema = z.object({
  product_id: z.string().nullable().optional(),
  name: z.string().min(1),
  hsn_code: z.string().optional().nullable(),
  qty: z.coerce.number(),
  unit: z.string().optional().default('Nos'),
  rate: z.coerce.number(),
  tax_rate: z.coerce.number().optional().default(18),
});

const recurringSchema = z.object({
  name: z.string().min(1),
  party_id: z.string().nullable().optional(),
  party_name: z.string().optional().nullable(),
  items: z.array(itemSchema).min(1),
  discount: z.coerce.number().optional().default(0),
  notes: z.string().optional().nullable(),
  cadence: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']),
  cadence_n: z.coerce.number().int().positive().optional().default(1),
  start_date: z.string(),
  end_date: z.string().optional().nullable(),
  status: z.enum(['active', 'paused', 'ended']).optional().default('active'),
  autosend: z.union([z.boolean(), z.coerce.number()]).optional().default(false),
});

function rowToTemplate(r) {
  if (!r) return null;
  let items = [];
  try { items = JSON.parse(r.items_json || '[]'); } catch {}
  return { ...r, items, items_json: undefined, autosend: !!r.autosend };
}

function getBusinessStateCode() {
  const v = db.prepare("SELECT value FROM settings WHERE key = 'stateCode'").get()?.value;
  return v || '27';
}

function getInvoicePrefix() {
  const v = db.prepare("SELECT value FROM settings WHERE key = 'invoicePrefix'").get()?.value;
  return v || 'INV';
}

function nextSaleNo() {
  const prefix = getInvoicePrefix();
  const count = db.prepare("SELECT COUNT(*) c FROM invoices WHERE type = 'sale'").get().c;
  let n = count + 1;
  while (db.prepare('SELECT 1 FROM invoices WHERE no = ?').get(`${prefix}-${String(n).padStart(3, '0')}`)) n++;
  return `${prefix}-${String(n).padStart(3, '0')}`;
}

/**
 * Generate one real invoice from the template, write it to DB, advance the schedule.
 * Returns { invoice, template }. Reused by both /:id/run and the hourly scheduler.
 */
export function runTemplate(templateId, { req = null, manual = false } = {}) {
  const t = db.prepare('SELECT * FROM recurring_invoices WHERE id = ?').get(templateId);
  if (!t) throw new HttpError(404, 'Template not found');
  if (t.status !== 'active' && !manual) {
    return { skipped: true, reason: `template status is ${t.status}` };
  }

  let items;
  try { items = JSON.parse(t.items_json); } catch { throw new HttpError(500, 'Template items_json malformed'); }

  const businessState = getBusinessStateCode();
  let interstate = false;
  let partyName = t.party_name;
  if (t.party_id) {
    const p = db.prepare('SELECT state_code, name FROM parties WHERE id = ?').get(t.party_id);
    if (p) {
      interstate = isInterstate(p.state_code, businessState);
      partyName = partyName || p.name;
    }
  }
  const calc = calcInvoice({ items, discount: t.discount || 0, interstate });
  const id = nanoid(12);
  const no = nextSaleNo();
  const date = todayISO();
  // Default due-date 15 days from today (matches paymentTerms convention)
  const due = (() => { const d = new Date(date + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 15); return d.toISOString().slice(0, 10); })();
  const inv = {
    id, no, type: 'sale', date, due_date: due,
    party_id: t.party_id || null, party_name: partyName,
    interstate: interstate ? 1 : 0,
    subtotal: calc.subtotal, discount: calc.discount,
    cgst_total: calc.cgst_total, sgst_total: calc.sgst_total, igst_total: calc.igst_total,
    total: calc.total,
    amount_paid: 0,
    status: t.autosend ? 'sent' : 'draft',
    notes: t.notes || `Auto-generated from recurring template "${t.name}"`,
  };

  db.transaction(() => {
    db.prepare(`INSERT INTO invoices
      (id, no, type, date, due_date, party_id, party_name, interstate, subtotal, discount, cgst_total, sgst_total, igst_total, total, amount_paid, status, notes)
      VALUES (@id, @no, @type, @date, @due_date, @party_id, @party_name, @interstate, @subtotal, @discount, @cgst_total, @sgst_total, @igst_total, @total, @amount_paid, @status, @notes)`).run(inv);
    calc.items.forEach((it, i) => {
      db.prepare(`INSERT INTO invoice_items
        (id, invoice_id, product_id, name, hsn_code, qty, unit, rate, tax_rate, taxable_amt, tax_amt, total, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
          nanoid(12), id, it.product_id || null, it.name, it.hsn_code || null,
          it.qty, it.unit || 'Nos', it.rate, it.tax_rate, it.taxable_amt, it.tax_amt, it.total, i
        );
      // Stock deduction for active sale invoices
      if (it.product_id && t.autosend) {
        db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(it.qty, it.product_id);
        db.prepare(`INSERT INTO stock_movements (id, product_id, qty, type, reason, ref_id)
          VALUES (?, ?, ?, ?, ?, ?)`).run(nanoid(12), it.product_id, -it.qty, 'sale', `Recurring ${t.name}`, id);
      }
    });

    // Advance schedule
    const nextRun = advanceDate(t.next_run_date, t.cadence, t.cadence_n);
    const newStatus = shouldEnd(nextRun, t.end_date) ? 'ended' : t.status;
    db.prepare(`UPDATE recurring_invoices
      SET next_run_date = ?, status = ?, last_invoice_id = ?, last_run_at = datetime('now'),
          run_count = run_count + 1, updated_at = datetime('now')
      WHERE id = ?`).run(nextRun, newStatus, id, templateId);
  })();

  // Audit
  recordAudit({
    req, action: manual ? 'recurring_run_manual' : 'recurring_run_auto', entity: 'recurring',
    entityId: templateId,
    after: { invoice_no: no, invoice_id: id, total: inv.total, party_name: partyName },
    summary: `${manual ? 'Manually ran' : 'Auto-ran'} recurring template "${t.name}" → invoice ${no} (₹${inv.total})`,
  });

  return { invoice: db.prepare('SELECT * FROM invoices WHERE id = ?').get(id), template: rowToTemplate(db.prepare('SELECT * FROM recurring_invoices WHERE id = ?').get(templateId)) };
}

router.get('/', (req, res) => {
  const { status, q } = req.query;
  const where = [];
  const params = [];
  if (status) { where.push('status = ?'); params.push(status); }
  if (q) { where.push('(name LIKE ? OR party_name LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const pag = parsePagination(req.query);
  const result = paginatedQuery(db, 'SELECT * FROM recurring_invoices', whereClause, "ORDER BY status = 'active' DESC, next_run_date ASC, name ASC", params, pag);
  if (Array.isArray(result)) {
    res.json(result.map(rowToTemplate));
  } else {
    res.json({ ...result, rows: result.rows.map(rowToTemplate) });
  }
});

router.get('/:id', (req, res) => {
  const t = db.prepare('SELECT * FROM recurring_invoices WHERE id = ?').get(req.params.id);
  if (!t) throw new HttpError(404, 'Template not found');
  // Include the recent invoices generated by this template
  const invoices = db.prepare(`SELECT id, no, date, total, status FROM invoices
    WHERE notes LIKE ? OR id = ?
    ORDER BY date DESC LIMIT 50`).all(`%recurring template "${t.name}"%`, t.last_invoice_id || '');
  res.json({ ...rowToTemplate(t), invoices });
});

router.post('/', validate(recurringSchema), (req, res) => {
  const id = nanoid(12);
  const body = req.body;
  let partyName = body.party_name;
  if (!partyName && body.party_id) {
    partyName = db.prepare('SELECT name FROM parties WHERE id = ?').get(body.party_id)?.name || null;
  }
  const row = {
    id,
    name: body.name,
    party_id: body.party_id || null,
    party_name: partyName,
    items_json: JSON.stringify(body.items),
    discount: body.discount || 0,
    notes: body.notes || null,
    cadence: body.cadence,
    cadence_n: body.cadence_n,
    start_date: body.start_date,
    next_run_date: body.start_date, // first run on the start date
    end_date: body.end_date || null,
    status: body.status,
    autosend: body.autosend ? 1 : 0,
  };
  db.prepare(`INSERT INTO recurring_invoices
    (id, name, party_id, party_name, items_json, discount, notes, cadence, cadence_n, start_date, next_run_date, end_date, status, autosend)
    VALUES (@id, @name, @party_id, @party_name, @items_json, @discount, @notes, @cadence, @cadence_n, @start_date, @next_run_date, @end_date, @status, @autosend)`)
    .run(row);
  const fresh = rowToTemplate(db.prepare('SELECT * FROM recurring_invoices WHERE id = ?').get(id));
  audit.create(req, 'recurring', { ...fresh, items: '<…>' }, `Created recurring "${row.name}" — ${row.cadence_n}× ${row.cadence}, starts ${row.start_date}`);
  res.status(201).json(fresh);
});

router.put('/:id', validate(recurringSchema), (req, res) => {
  const before = db.prepare('SELECT * FROM recurring_invoices WHERE id = ?').get(req.params.id);
  if (!before) throw new HttpError(404, 'Template not found');
  const body = req.body;
  let partyName = body.party_name;
  if (!partyName && body.party_id) {
    partyName = db.prepare('SELECT name FROM parties WHERE id = ?').get(body.party_id)?.name || null;
  }
  // If start_date changed AND there have been no runs yet, also reset next_run_date
  const next_run_date = (before.run_count === 0 && body.start_date !== before.start_date)
    ? body.start_date
    : before.next_run_date;
  db.prepare(`UPDATE recurring_invoices SET
    name=?, party_id=?, party_name=?, items_json=?, discount=?, notes=?,
    cadence=?, cadence_n=?, start_date=?, next_run_date=?, end_date=?,
    status=?, autosend=?, updated_at=datetime('now')
    WHERE id=?`).run(
      body.name, body.party_id || null, partyName, JSON.stringify(body.items),
      body.discount || 0, body.notes || null, body.cadence, body.cadence_n,
      body.start_date, next_run_date, body.end_date || null, body.status, body.autosend ? 1 : 0,
      req.params.id,
    );
  const after = rowToTemplate(db.prepare('SELECT * FROM recurring_invoices WHERE id = ?').get(req.params.id));
  audit.update(req, 'recurring', rowToTemplate(before), after, `Edited recurring "${after.name}"`);
  res.json(after);
});

router.delete('/:id', (req, res) => {
  const before = db.prepare('SELECT * FROM recurring_invoices WHERE id = ?').get(req.params.id);
  if (!before) throw new HttpError(404, 'Template not found');
  db.prepare('DELETE FROM recurring_invoices WHERE id = ?').run(req.params.id);
  audit.delete(req, 'recurring', rowToTemplate(before), `Deleted recurring "${before.name}"`);
  res.status(204).end();
});

router.post('/:id/run', (req, res) => {
  const result = runTemplate(req.params.id, { req, manual: true });
  res.status(201).json(result);
});

router.post('/:id/pause', (req, res) => {
  const before = db.prepare('SELECT * FROM recurring_invoices WHERE id = ?').get(req.params.id);
  if (!before) throw new HttpError(404, 'Template not found');
  db.prepare("UPDATE recurring_invoices SET status = 'paused', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
  recordAudit({ req, action: 'recurring_pause', entity: 'recurring', entityId: req.params.id, summary: `Paused recurring "${before.name}"` });
  res.json(rowToTemplate(db.prepare('SELECT * FROM recurring_invoices WHERE id = ?').get(req.params.id)));
});

router.post('/:id/resume', (req, res) => {
  const before = db.prepare('SELECT * FROM recurring_invoices WHERE id = ?').get(req.params.id);
  if (!before) throw new HttpError(404, 'Template not found');
  db.prepare("UPDATE recurring_invoices SET status = 'active', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
  recordAudit({ req, action: 'recurring_resume', entity: 'recurring', entityId: req.params.id, summary: `Resumed recurring "${before.name}"` });
  res.json(rowToTemplate(db.prepare('SELECT * FROM recurring_invoices WHERE id = ?').get(req.params.id)));
});

export default router;
