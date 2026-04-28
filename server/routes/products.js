import { Router } from 'express';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import db from '../db/db.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../middleware/errorHandler.js';
import { audit, recordAudit } from '../utils/audit.js';
import { parsePagination, paginatedQuery } from '../utils/pagination.js';

const router = Router();

const productSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  hsn_code: z.string().optional().nullable(),
  unit: z.string().optional().default('Nos'),
  sale_price: z.coerce.number().min(0),
  buy_price: z.coerce.number().min(0).optional().default(0),
  tax_rate: z.coerce.number().min(0).optional().default(18),
  stock: z.coerce.number().optional().default(0),
  min_stock: z.coerce.number().optional().default(0),
  has_serial: z.union([z.boolean(), z.number(), z.string()]).optional().default(0),
  warranty_months: z.coerce.number().int().min(0).max(600).nullable().optional(),
});

const stockAdjustSchema = z.object({
  qty: z.coerce.number(),
  reason: z.string().optional().nullable(),
  date: z.string().optional(),
  type: z.enum(['purchase', 'sale', 'adjustment', 'return']).optional().default('adjustment'),
});

// SQLite columns are nullable but better-sqlite3 named-bind needs every key
// to exist on the object — coerce undefined → null.
const PRODUCT_NULLABLE = ['sku', 'category', 'description', 'hsn_code'];
function normalizeProduct(body) {
  const out = { ...body };
  for (const k of PRODUCT_NULLABLE) if (out[k] === undefined) out[k] = null;
  if (out.unit === undefined) out.unit = 'Nos';
  if (out.buy_price === undefined) out.buy_price = 0;
  if (out.tax_rate === undefined) out.tax_rate = 18;
  if (out.stock === undefined) out.stock = 0;
  if (out.min_stock === undefined) out.min_stock = 0;
  out.has_serial = (out.has_serial === true || out.has_serial === 1 || out.has_serial === '1') ? 1 : 0;
  if (out.warranty_months === undefined || out.warranty_months === '' || out.warranty_months === null) {
    out.warranty_months = null;
  } else {
    out.warranty_months = Number(out.warranty_months);
  }
  return out;
}

router.get('/', (req, res) => {
  const { q, category } = req.query;
  const where = [];
  const params = [];
  if (q) { where.push('(name LIKE ? OR sku LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
  if (category) { where.push('category = ?'); params.push(category); }
  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const pag = parsePagination(req.query);
  res.json(paginatedQuery(db, 'SELECT * FROM products', whereClause, 'ORDER BY name', params, pag));
});

router.get('/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) throw new HttpError(404, 'Product not found');
  const movements = db.prepare(`SELECT * FROM stock_movements WHERE product_id = ? ORDER BY created_at DESC`).all(req.params.id);
  res.json({ ...product, movements });
});

router.post('/', validate(productSchema), (req, res) => {
  const id = nanoid(12);
  const p = normalizeProduct({ id, ...req.body });
  if (!p.sku) p.sku = `SKU-${id.slice(0, 6).toUpperCase()}`;
  db.prepare(`INSERT INTO products
    (id, name, sku, category, description, hsn_code, unit, sale_price, buy_price, tax_rate, stock, min_stock, has_serial, warranty_months)
    VALUES (@id, @name, @sku, @category, @description, @hsn_code, @unit, @sale_price, @buy_price, @tax_rate, @stock, @min_stock, @has_serial, @warranty_months)`).run(p);
  const fresh = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  audit.create(req, 'product', fresh, `Added product ${fresh.name} (${fresh.sku})`);
  res.status(201).json(fresh);
});

router.put('/:id', validate(productSchema), (req, res) => {
  const before = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!before) throw new HttpError(404, 'Product not found');
  const p = normalizeProduct({ id: req.params.id, ...req.body });
  if (!p.sku) p.sku = before.sku || `SKU-${req.params.id.slice(0, 6).toUpperCase()}`;
  db.prepare(`UPDATE products SET
    name=@name, sku=@sku, category=@category, description=@description, hsn_code=@hsn_code,
    unit=@unit, sale_price=@sale_price, buy_price=@buy_price, tax_rate=@tax_rate,
    stock=@stock, min_stock=@min_stock,
    has_serial=@has_serial, warranty_months=@warranty_months,
    updated_at=datetime('now')
    WHERE id=@id`).run(p);
  const after = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  audit.update(req, 'product', before, after, `Updated product ${after.name}`);
  res.json(after);
});

router.delete('/:id', (req, res) => {
  const before = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!before) throw new HttpError(404, 'Product not found');
  const onInvoice = db.prepare('SELECT COUNT(*) c FROM invoice_items WHERE product_id = ?').get(req.params.id).c;
  const stockHist = db.prepare('SELECT COUNT(*) c FROM stock_movements WHERE product_id = ?').get(req.params.id).c;
  if (onInvoice > 0 || stockHist > 0) {
    throw new HttpError(409, `Cannot delete: product appears on ${onInvoice} invoice line(s) and has ${stockHist} stock movement(s). Edit the product instead.`);
  }
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  audit.delete(req, 'product', before, `Deleted product ${before.name}`);
  res.status(204).end();
});

router.post('/:id/adjust-stock', validate(stockAdjustSchema), (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) throw new HttpError(404, 'Product not found');
  const { qty, reason, type } = req.body;
  db.transaction(() => {
    db.prepare(`INSERT INTO stock_movements (id, product_id, qty, type, reason)
      VALUES (?, ?, ?, ?, ?)`).run(nanoid(12), req.params.id, qty, type || 'adjustment', reason);
    db.prepare('UPDATE products SET stock = stock + ?, updated_at = datetime(\'now\') WHERE id = ?').run(qty, req.params.id);
  })();
  const after = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  recordAudit({
    req, action: 'adjust_stock', entity: 'product', entityId: req.params.id,
    before: { stock: product.stock }, after: { stock: after.stock, qty, type, reason },
    summary: `Stock ${qty >= 0 ? '+' : ''}${qty} ${after.unit} for ${after.name} (${reason || type || 'adjustment'})`,
  });
  res.json(after);
});

export default router;
