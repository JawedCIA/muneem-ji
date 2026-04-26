import { Router } from 'express';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import db from '../db/db.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/errorHandler.js';
import { audit } from '../utils/audit.js';
import { parsePagination, paginatedQuery } from '../utils/pagination.js';
import { assertNotLocked } from '../utils/periodLock.js';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const expenseSchema = z.object({
  date: z.string(),
  category: z.string().min(1),
  description: z.string().optional().nullable(),
  vendor: z.string().optional().nullable(),
  amount: z.coerce.number().positive(),
  payment_mode: z.string().optional().default('cash'),
  receipt_path: z.string().optional().nullable(),
});

router.get('/', (req, res) => {
  const { from, to, category } = req.query;
  const where = [];
  const params = [];
  if (from) { where.push('date >= ?'); params.push(from); }
  if (to) { where.push('date <= ?'); params.push(to); }
  if (category) { where.push('category = ?'); params.push(category); }
  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const pag = parsePagination(req.query);
  res.json(paginatedQuery(db, 'SELECT * FROM expenses', whereClause, 'ORDER BY date DESC', params, pag));
});

router.post('/', upload.single('receipt'), (req, res, next) => {
  try {
    const data = { ...req.body };
    if (req.file) data.receipt_path = `/uploads/${req.file.filename}`;
    const parsed = expenseSchema.parse(data);
    assertNotLocked(parsed.date, 'create expense');
    const id = nanoid(12);
    db.prepare(`INSERT INTO expenses (id, date, category, description, vendor, amount, payment_mode, receipt_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
        id, parsed.date, parsed.category, parsed.description || null, parsed.vendor || null,
        parsed.amount, parsed.payment_mode, parsed.receipt_path || null
      );
    const fresh = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
    audit.create(req, 'expense', fresh, `Recorded expense: ${fresh.category} ₹${fresh.amount}${fresh.vendor ? ` (${fresh.vendor})` : ''}`);
    res.status(201).json(fresh);
  } catch (e) { next(e); }
});

router.put('/:id', upload.single('receipt'), (req, res, next) => {
  try {
    const before = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
    if (!before) throw new HttpError(404, 'Expense not found');
    const data = { ...req.body };
    if (req.file) data.receipt_path = `/uploads/${req.file.filename}`;
    const parsed = expenseSchema.parse(data);
    assertNotLocked([before.date, parsed.date], 'edit expense');
    db.prepare(`UPDATE expenses SET date=?, category=?, description=?, vendor=?, amount=?, payment_mode=?, receipt_path=? WHERE id=?`).run(
      parsed.date, parsed.category, parsed.description || null, parsed.vendor || null,
      parsed.amount, parsed.payment_mode, parsed.receipt_path || null, req.params.id
    );
    const after = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
    audit.update(req, 'expense', before, after, `Edited expense ${after.category} ₹${after.amount}`);
    res.json(after);
  } catch (e) { next(e); }
});

router.delete('/:id', (req, res) => {
  const before = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
  if (!before) throw new HttpError(404, 'Expense not found');
  assertNotLocked(before.date, 'delete expense');
  db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
  audit.delete(req, 'expense', before, `Deleted expense ${before.category} ₹${before.amount}`);
  res.status(204).end();
});

export default router;
