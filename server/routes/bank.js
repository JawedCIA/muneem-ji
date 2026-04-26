import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import db from '../db/db.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/errorHandler.js';
import { audit, recordAudit } from '../utils/audit.js';
import { parseBankCSV, detectBankColumns, normalizeStatementRows } from '../utils/csv.js';
import { parsePagination, paginatedQuery } from '../utils/pagination.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// --- Bank accounts ---

const accountSchema = z.object({
  name: z.string().min(1),
  bank_name: z.string().optional().nullable(),
  account_no: z.string().optional().nullable(),
  currency: z.string().optional().default('INR'),
  opening_bal: z.coerce.number().optional().default(0),
  notes: z.string().optional().nullable(),
});

router.get('/accounts', (req, res) => {
  const accounts = db.prepare('SELECT * FROM bank_accounts ORDER BY name').all();
  // Enrich with last-line + reconciled stats
  const rows = accounts.map((a) => {
    const stats = db.prepare(`
      SELECT
        COUNT(*) AS total_lines,
        SUM(CASE WHEN m.id IS NOT NULL THEN 1 ELSE 0 END) AS reconciled_lines,
        MAX(l.date) AS last_line_date
      FROM bank_statement_lines l
      LEFT JOIN reconciliation_matches m ON m.line_id = l.id
      WHERE l.account_id = ?
    `).get(a.id);
    return { ...a, ...stats, unreconciled_lines: (stats.total_lines || 0) - (stats.reconciled_lines || 0) };
  });
  res.json(rows);
});

router.post('/accounts', validate(accountSchema), (req, res) => {
  const id = nanoid(12);
  const a = { id, ...req.body, opening_bal: req.body.opening_bal || 0 };
  db.prepare(`INSERT INTO bank_accounts (id, name, bank_name, account_no, currency, opening_bal, notes)
    VALUES (@id, @name, @bank_name, @account_no, @currency, @opening_bal, @notes)`).run({
      ...a,
      bank_name: a.bank_name || null,
      account_no: a.account_no || null,
      notes: a.notes || null,
    });
  const fresh = db.prepare('SELECT * FROM bank_accounts WHERE id = ?').get(id);
  audit.create(req, 'bank_account', fresh, `Added bank account ${fresh.name}`);
  res.status(201).json(fresh);
});

router.put('/accounts/:id', validate(accountSchema), (req, res) => {
  const before = db.prepare('SELECT * FROM bank_accounts WHERE id = ?').get(req.params.id);
  if (!before) throw new HttpError(404, 'Account not found');
  db.prepare(`UPDATE bank_accounts SET name=?, bank_name=?, account_no=?, currency=?, opening_bal=?, notes=?, updated_at=datetime('now') WHERE id=?`)
    .run(req.body.name, req.body.bank_name || null, req.body.account_no || null, req.body.currency, req.body.opening_bal || 0, req.body.notes || null, req.params.id);
  const after = db.prepare('SELECT * FROM bank_accounts WHERE id = ?').get(req.params.id);
  audit.update(req, 'bank_account', before, after, `Updated bank account ${after.name}`);
  res.json(after);
});

router.delete('/accounts/:id', (req, res) => {
  const before = db.prepare('SELECT * FROM bank_accounts WHERE id = ?').get(req.params.id);
  if (!before) throw new HttpError(404, 'Account not found');
  // Statement lines + matches cascade. Confirm we're not silently destroying matched payments.
  const lineCount = db.prepare('SELECT COUNT(*) c FROM bank_statement_lines WHERE account_id = ?').get(req.params.id).c;
  if (lineCount > 0) {
    throw new HttpError(409, `Cannot delete: ${lineCount} statement line(s) imported. Delete each statement first, or re-create the account.`);
  }
  db.prepare('DELETE FROM bank_accounts WHERE id = ?').run(req.params.id);
  audit.delete(req, 'bank_account', before, `Deleted bank account ${before.name}`);
  res.status(204).end();
});

// --- Statement import ---

// Step 1: peek — parse the CSV but don't insert. Returns headers + auto-detected mapping
// + first 5 sample rows. The UI shows this so the user can confirm columns before committing.
router.post('/peek', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  let parsed;
  try { parsed = parseBankCSV(req.file.buffer.toString('utf-8')); }
  catch (e) { return res.status(400).json({ error: `Could not parse CSV: ${e.message}` }); }
  const detected = detectBankColumns(parsed.headers);
  res.json({
    headers: parsed.headers,
    detected,
    rowCount: parsed.rows.length,
    sample: parsed.rows.slice(0, 5),
  });
});

const importSchema = z.object({
  account_id: z.string().min(1),
  mapping: z.object({
    date: z.string(),
    description: z.string().optional().nullable(),
    reference: z.string().optional().nullable(),
    debit: z.string().optional().nullable(),
    credit: z.string().optional().nullable(),
    balance: z.string().optional().nullable(),
  }),
});

// Step 2: commit — actually import
router.post('/import', upload.single('file'), (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const meta = importSchema.parse({
      account_id: req.body.account_id,
      mapping: typeof req.body.mapping === 'string' ? JSON.parse(req.body.mapping) : req.body.mapping,
    });
    const account = db.prepare('SELECT * FROM bank_accounts WHERE id = ?').get(meta.account_id);
    if (!account) throw new HttpError(404, 'Account not found');

    const parsed = parseBankCSV(req.file.buffer.toString('utf-8'));
    const normalised = normalizeStatementRows(parsed.rows, meta.mapping);
    if (normalised.length === 0) return res.status(400).json({ error: 'No usable rows in the CSV (no parseable dates or non-zero amounts).' });

    const filename = req.file.originalname || 'unknown.csv';
    const insert = db.prepare(`INSERT INTO bank_statement_lines
      (id, account_id, date, description, reference, debit, credit, balance, source_file, raw_row)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    let inserted = 0;
    db.transaction(() => {
      for (const r of normalised) {
        insert.run(nanoid(12), meta.account_id, r.date, r.description, r.reference, r.debit, r.credit, r.balance, filename, JSON.stringify(r.raw));
        inserted++;
      }
    })();

    recordAudit({
      req, action: 'bank_import', entity: 'bank_account', entityId: meta.account_id,
      after: { lines: inserted, file: filename, account: account.name },
      summary: `Imported ${inserted} statement line(s) into ${account.name} from ${filename}`,
    });

    res.status(201).json({ ok: true, inserted, total: normalised.length });
  } catch (e) { next(e); }
});

// --- Statement lines ---

router.get('/lines', (req, res) => {
  const { account_id, status, from, to, q } = req.query;
  const where = ['1=1'];
  const params = [];
  if (account_id) { where.push('l.account_id = ?'); params.push(account_id); }
  if (from) { where.push('l.date >= ?'); params.push(from); }
  if (to) { where.push('l.date <= ?'); params.push(to); }
  if (q) { where.push('(l.description LIKE ? OR l.reference LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
  if (status === 'matched')   where.push('m.id IS NOT NULL');
  if (status === 'unmatched') where.push('m.id IS NULL');

  const baseSql = `SELECT l.*, m.id AS match_id, m.match_type, m.payment_id, m.expense_id
    FROM bank_statement_lines l
    LEFT JOIN reconciliation_matches m ON m.line_id = l.id`;
  const whereClause = 'WHERE ' + where.join(' AND ');

  const pag = parsePagination(req.query);
  res.json(paginatedQuery(db, baseSql, whereClause, 'ORDER BY l.date DESC, l.id DESC', params, pag));
});

router.delete('/lines/:id', (req, res) => {
  const before = db.prepare('SELECT * FROM bank_statement_lines WHERE id = ?').get(req.params.id);
  if (!before) throw new HttpError(404, 'Line not found');
  db.prepare('DELETE FROM bank_statement_lines WHERE id = ?').run(req.params.id);
  recordAudit({ req, action: 'delete', entity: 'bank_line', entityId: req.params.id, before, summary: `Deleted statement line ${before.date} ${before.description || ''}` });
  res.status(204).end();
});

// --- Matching ---

const matchSchema = z.object({
  line_id: z.string().min(1),
  match_type: z.enum(['payment', 'expense']),
  payment_id: z.string().nullable().optional(),
  expense_id: z.string().nullable().optional(),
  notes: z.string().optional().nullable(),
});

router.post('/match', validate(matchSchema), (req, res) => {
  const { line_id, match_type, payment_id, expense_id, notes } = req.body;
  if (match_type === 'payment' && !payment_id) throw new HttpError(400, 'payment_id required for match_type=payment');
  if (match_type === 'expense' && !expense_id) throw new HttpError(400, 'expense_id required for match_type=expense');

  const line = db.prepare('SELECT * FROM bank_statement_lines WHERE id = ?').get(line_id);
  if (!line) throw new HttpError(404, 'Statement line not found');

  // Refuse if this line is already matched (v1 single-match rule)
  const existing = db.prepare('SELECT id FROM reconciliation_matches WHERE line_id = ?').get(line_id);
  if (existing) throw new HttpError(409, 'This line is already matched. Unmatch it first.');

  const id = nanoid(12);
  db.prepare(`INSERT INTO reconciliation_matches (id, line_id, match_type, payment_id, expense_id, matched_by, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(id, line_id, match_type, payment_id || null, expense_id || null, req.user?.id || null, notes || null);

  const target = match_type === 'payment'
    ? db.prepare('SELECT amount, mode FROM payments WHERE id = ?').get(payment_id)
    : db.prepare('SELECT amount, category FROM expenses WHERE id = ?').get(expense_id);
  recordAudit({
    req, action: 'reconcile', entity: 'bank_line', entityId: line_id,
    after: { match_type, payment_id, expense_id, line_amount: line.credit || line.debit },
    summary: `Matched ${line.date} (₹${line.credit || line.debit}) → ${match_type} ${match_type === 'payment' ? `${target?.mode || ''}` : `${target?.category || ''}`} (₹${target?.amount || 0})`,
  });

  res.status(201).json({ id, line_id, match_type, payment_id, expense_id });
});

router.delete('/match/:id', (req, res) => {
  const m = db.prepare('SELECT * FROM reconciliation_matches WHERE id = ?').get(req.params.id);
  if (!m) throw new HttpError(404, 'Match not found');
  db.prepare('DELETE FROM reconciliation_matches WHERE id = ?').run(req.params.id);
  recordAudit({
    req, action: 'unreconcile', entity: 'bank_line', entityId: m.line_id,
    before: m,
    summary: `Unmatched statement line ${m.line_id}`,
  });
  res.status(204).end();
});

// --- Suggestions: candidate payments/expenses for a given line ---
router.get('/suggestions/:line_id', (req, res) => {
  const line = db.prepare('SELECT * FROM bank_statement_lines WHERE id = ?').get(req.params.line_id);
  if (!line) throw new HttpError(404, 'Line not found');

  const target = line.credit || line.debit;
  // Search ±0.01 amount tolerance, ±7 days date window, only unmatched records
  const winFrom = (() => { const d = new Date(line.date); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10); })();
  const winTo   = (() => { const d = new Date(line.date); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); })();

  const payments = line.credit > 0 ? db.prepare(`
    SELECT p.*, i.no AS invoice_no, COALESCE(pr.name, i.party_name) AS party_name
    FROM payments p
    LEFT JOIN invoices i ON i.id = p.invoice_id
    LEFT JOIN parties pr ON pr.id = p.party_id
    WHERE p.amount = ? AND p.date BETWEEN ? AND ?
      AND NOT EXISTS (SELECT 1 FROM reconciliation_matches m WHERE m.payment_id = p.id)
    LIMIT 10
  `).all(target, winFrom, winTo) : [];

  const expenses = line.debit > 0 ? db.prepare(`
    SELECT * FROM expenses
    WHERE amount = ? AND date BETWEEN ? AND ?
      AND NOT EXISTS (SELECT 1 FROM reconciliation_matches m WHERE m.expense_id = id)
    LIMIT 10
  `).all(target, winFrom, winTo) : [];

  res.json({ line, payments, expenses });
});

export default router;
