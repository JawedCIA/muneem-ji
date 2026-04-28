import { Router } from 'express';
import db from '../db/db.js';
import { HttpError } from '../middleware/errorHandler.js';
import { buildGstr1, buildGstr3b, gstr1ToCsv } from '../utils/gstr.js';

const router = Router();

const monthStart = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};
const today = () => new Date().toISOString().slice(0, 10);

router.get('/dashboard', (req, res) => {
  const ms = monthStart();
  const t = today();

  const salesThisMonth = db.prepare(
    `SELECT COALESCE(SUM(total), 0) v FROM invoices WHERE type = 'sale' AND status != 'cancelled' AND date >= ?`
  ).get(ms).v;

  const collectedThisMonth = db.prepare(
    `SELECT COALESCE(SUM(amount), 0) v FROM payments WHERE date >= ?`
  ).get(ms).v;

  const outstanding = db.prepare(
    `SELECT COALESCE(SUM(total - amount_paid), 0) v FROM invoices
     WHERE type = 'sale' AND status NOT IN ('paid','draft','cancelled')`
  ).get().v;

  const expensesThisMonth = db.prepare(
    `SELECT COALESCE(SUM(amount), 0) v FROM expenses WHERE date >= ?`
  ).get(ms).v;

  // Last 6 months sales vs expenses
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const startStr = `${y}-${m}-01`;
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const endStr = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`;
    const sales = db.prepare(
      `SELECT COALESCE(SUM(total), 0) v FROM invoices WHERE type = 'sale' AND status != 'cancelled' AND date >= ? AND date < ?`
    ).get(startStr, endStr).v;
    const exp = db.prepare(
      `SELECT COALESCE(SUM(amount), 0) v FROM expenses WHERE date >= ? AND date < ?`
    ).get(startStr, endStr).v;
    months.push({ month: d.toLocaleString('en-US', { month: 'short' }), sales, expenses: exp });
  }

  // Expense breakdown by category (this month)
  const expenseBreakdown = db.prepare(
    `SELECT category, COALESCE(SUM(amount), 0) value FROM expenses WHERE date >= ? GROUP BY category ORDER BY value DESC`
  ).all(ms);

  // Recent invoices
  const recentInvoices = db.prepare(
    `SELECT id, no, date, party_name, total, status FROM invoices WHERE type = 'sale' ORDER BY date DESC, no DESC LIMIT 5`
  ).all();

  // Low stock
  const lowStock = db.prepare(
    `SELECT id, name, sku, stock, min_stock, unit FROM products WHERE stock <= min_stock ORDER BY (stock - min_stock) ASC LIMIT 8`
  ).all();

  res.json({
    kpi: { salesThisMonth, collectedThisMonth, outstanding, expensesThisMonth },
    chartMonthly: months,
    expenseBreakdown,
    recentInvoices,
    lowStock,
  });
});

router.get('/sales-register', (req, res) => {
  const { from, to } = req.query;
  const where = ["type = 'sale'", "status != 'cancelled'"];
  const params = [];
  if (from) { where.push('date >= ?'); params.push(from); }
  if (to) { where.push('date <= ?'); params.push(to); }
  const rows = db.prepare(`SELECT id, no, date, party_name, subtotal, cgst_total, sgst_total, igst_total, total, status
    FROM invoices WHERE ${where.join(' AND ')} ORDER BY date DESC`).all(...params);
  res.json(rows);
});

router.get('/gst-summary', (req, res) => {
  const { from, to } = req.query;
  const where = ["i.type = 'sale'", "i.status != 'cancelled'"];
  const params = [];
  if (from) { where.push('i.date >= ?'); params.push(from); }
  if (to) { where.push('i.date <= ?'); params.push(to); }
  const sql = `SELECT
    it.tax_rate,
    SUM(it.taxable_amt) AS taxable,
    SUM(CASE WHEN i.interstate = 0 THEN it.taxable_amt * (it.tax_rate / 200.0) ELSE 0 END) AS cgst,
    SUM(CASE WHEN i.interstate = 0 THEN it.taxable_amt * (it.tax_rate / 200.0) ELSE 0 END) AS sgst,
    SUM(CASE WHEN i.interstate = 1 THEN it.taxable_amt * (it.tax_rate / 100.0) ELSE 0 END) AS igst,
    SUM(it.tax_amt) AS total_tax
    FROM invoice_items it
    JOIN invoices i ON i.id = it.invoice_id
    WHERE ${where.join(' AND ')}
    GROUP BY it.tax_rate
    ORDER BY it.tax_rate`;
  res.json(db.prepare(sql).all(...params));
});

router.get('/pl', (req, res) => {
  const { from, to } = req.query;
  const where = ["type = 'sale'", "status NOT IN ('cancelled', 'draft')"];
  const params = [];
  if (from) { where.push('date >= ?'); params.push(from); }
  if (to) { where.push('date <= ?'); params.push(to); }

  const revenue = db.prepare(`SELECT COALESCE(SUM(amount_paid), 0) v FROM invoices WHERE ${where.join(' AND ')}`).get(...params).v;
  const totalSales = db.prepare(`SELECT COALESCE(SUM(subtotal), 0) v FROM invoices WHERE ${where.join(' AND ')}`).get(...params).v;

  // COGS estimate
  const cogsRow = db.prepare(`SELECT COALESCE(SUM(p.buy_price * it.qty), 0) v
    FROM invoice_items it
    JOIN invoices i ON i.id = it.invoice_id
    LEFT JOIN products p ON p.id = it.product_id
    WHERE ${where.map(w => w.replace(/^/, '').replace('type', 'i.type').replace('status', 'i.status').replace('date', 'i.date')).join(' AND ')}`)
    .get(...params).v;

  const expWhere = [];
  const expParams = [];
  if (from) { expWhere.push('date >= ?'); expParams.push(from); }
  if (to) { expWhere.push('date <= ?'); expParams.push(to); }
  const expenses = db.prepare(`SELECT COALESCE(SUM(amount), 0) v FROM expenses ${expWhere.length ? 'WHERE ' + expWhere.join(' AND ') : ''}`).get(...expParams).v;

  const grossProfit = totalSales - cogsRow;
  const netProfit = grossProfit - expenses;
  res.json({
    revenue: totalSales,
    collected: revenue,
    cogs: cogsRow,
    grossProfit,
    expenses,
    netProfit,
  });
});

router.get('/party-ledger/:id', (req, res) => {
  const party = db.prepare('SELECT * FROM parties WHERE id = ?').get(req.params.id);
  if (!party) throw new HttpError(404, 'Party not found');
  const invoices = db.prepare(`SELECT id, no, date, type, total, amount_paid, status FROM invoices WHERE party_id = ? ORDER BY date`).all(req.params.id);
  const payments = db.prepare(`SELECT id, date, amount, mode, reference, invoice_id FROM payments WHERE party_id = ? ORDER BY date`).all(req.params.id);

  const entries = [];
  invoices.forEach((inv) => {
    if (inv.status !== 'cancelled' && inv.type === 'sale') {
      entries.push({ date: inv.date, type: 'invoice', ref: inv.no, debit: inv.total, credit: 0, id: inv.id });
    }
  });
  payments.forEach((p) => {
    entries.push({ date: p.date, type: 'payment', ref: p.reference || p.mode, debit: 0, credit: p.amount, id: p.id });
  });
  entries.sort((a, b) => a.date.localeCompare(b.date));

  let balance = Number(party.opening_bal || 0);
  const ledger = entries.map((e) => {
    balance += (e.debit - e.credit);
    return { ...e, balance };
  });

  res.json({ party, opening: Number(party.opening_bal || 0), entries: ledger, closing: balance });
});

router.get('/expense-summary', (req, res) => {
  const { from, to } = req.query;
  const where = [];
  const params = [];
  if (from) { where.push('date >= ?'); params.push(from); }
  if (to) { where.push('date <= ?'); params.push(to); }
  const byCategory = db.prepare(`SELECT category, COALESCE(SUM(amount), 0) total
    FROM expenses ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    GROUP BY category ORDER BY total DESC`).all(...params);

  const byMonth = db.prepare(`SELECT substr(date, 1, 7) month, COALESCE(SUM(amount), 0) total
    FROM expenses ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    GROUP BY substr(date, 1, 7) ORDER BY month`).all(...params);

  res.json({ byCategory, byMonth });
});

// ───────────────────── GSTR-1 / GSTR-3B ─────────────────────

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function parsePeriod(req) {
  const period = String(req.query.period || '').trim();
  if (!PERIOD_RE.test(period)) {
    throw new HttpError(400, 'period must be YYYY-MM');
  }
  const from = `${period}-01`;
  const [y, m] = period.split('-').map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const to = `${period}-${String(lastDay).padStart(2, '0')}`;
  return { period, from, to };
}

function loadOutwardForPeriod(from, to) {
  const invoices = db.prepare(
    `SELECT i.*, p.gstin AS p_gstin, p.state_code AS p_state_code, p.name AS p_name
     FROM invoices i
     LEFT JOIN parties p ON p.id = i.party_id
     WHERE i.type IN ('sale', 'credit_note')
       AND i.date >= ? AND i.date <= ?
     ORDER BY i.no`
  ).all(from, to);
  const itemsStmt = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order');
  return invoices.map((inv) => ({
    ...inv,
    party: { gstin: inv.p_gstin, state_code: inv.p_state_code, name: inv.p_name },
    items: itemsStmt.all(inv.id),
  }));
}

function loadPurchasesForPeriod(from, to) {
  return db.prepare(
    `SELECT * FROM invoices WHERE type = 'purchase' AND date >= ? AND date <= ?`
  ).all(from, to);
}

function getSetting(key, fallback) {
  const r = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return r?.value ?? fallback;
}

function buildGstr1ForPeriod(from, to) {
  const invoices = loadOutwardForPeriod(from, to);
  const businessStateCode = getSetting('stateCode', '27');
  const b2clThreshold = Number(getSetting('b2clThreshold', '100000'));
  return buildGstr1({ invoices, businessStateCode, b2clThreshold });
}

router.get('/gstr1', (req, res) => {
  const { period, from, to } = parsePeriod(req);
  const result = buildGstr1ForPeriod(from, to);
  const counts = {
    b2b: result.b2b.length, b2cl: result.b2cl.length, b2cs: result.b2cs.length,
    cdnr: result.cdnr.length, cdnur: result.cdnur.length,
    hsn: result.hsn.length, docs: result.docs.length,
  };
  const totals = {
    taxable: 0, igst: 0, cgst: 0, sgst: 0, invoice_value: 0,
  };
  for (const r of [...result.b2b, ...result.b2cl, ...result.b2cs]) {
    totals.taxable += Number(r.taxable_value || 0);
    totals.igst += Number(r.igst || 0);
    totals.cgst += Number(r.cgst || 0);
    totals.sgst += Number(r.sgst || 0);
  }
  for (const r of [...result.cdnr, ...result.cdnur]) {
    totals.taxable -= Number(r.taxable_value || 0);
    totals.igst -= Number(r.igst || 0);
    totals.cgst -= Number(r.cgst || 0);
    totals.sgst -= Number(r.sgst || 0);
  }
  for (const k of Object.keys(totals)) totals[k] = Math.round(totals[k] * 100) / 100;
  res.json({ period, from, to, counts, totals, ...result });
});

router.get('/gstr1/csv', (req, res) => {
  const { period, from, to } = parsePeriod(req);
  const section = String(req.query.section || '').toLowerCase();
  const valid = ['b2b', 'b2cl', 'b2cs', 'cdnr', 'cdnur', 'hsn', 'docs'];
  if (!valid.includes(section)) {
    throw new HttpError(400, `section must be one of: ${valid.join(', ')}`);
  }
  const result = buildGstr1ForPeriod(from, to);
  const csv = gstr1ToCsv(section, result[section] || []);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="gstr1_${section}_${period}.csv"`);
  res.send(csv);
});

router.get('/gstr3b', (req, res) => {
  const { period, from, to } = parsePeriod(req);
  const outward = loadOutwardForPeriod(from, to);
  const purchases = loadPurchasesForPeriod(from, to);
  const businessStateCode = getSetting('stateCode', '27');
  const result = buildGstr3b({ outward, purchases, businessStateCode });
  res.json({ period, from, to, ...result });
});

export default router;
