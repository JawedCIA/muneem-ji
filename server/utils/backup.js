import { z } from 'zod';
import { nanoid } from 'nanoid';
import db from '../db/db.js';

export function exportAll() {
  const tables = ['settings', 'parties', 'products', 'stock_movements',
                  'invoices', 'invoice_items', 'payments', 'expenses'];
  const data = {};
  for (const t of tables) {
    data[t] = db.prepare(`SELECT * FROM ${t}`).all();
  }
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    appName: 'Muneem Ji',
    ...data,
  };
}

const importSchema = z.object({
  version: z.number().optional(),
  settings: z.array(z.any()).optional(),
  parties: z.array(z.any()).optional(),
  products: z.array(z.any()).optional(),
  stock_movements: z.array(z.any()).optional(),
  invoices: z.array(z.any()).optional(),
  invoice_items: z.array(z.any()).optional(),
  payments: z.array(z.any()).optional(),
  expenses: z.array(z.any()).optional(),
}).passthrough();

// Import — replaces all business data. Does NOT touch users.
export function importAll(payload, { mode = 'replace' } = {}) {
  const parsed = importSchema.parse(payload);

  // Normalize v1 → v2 if needed (v1 used `settings` as an object, v2 as array of {key, value} rows)
  let settingsRows = parsed.settings;
  if (settingsRows && !Array.isArray(settingsRows)) {
    settingsRows = Object.entries(settingsRows).map(([key, value]) => ({
      key, value: value == null ? null : String(value),
    }));
  }

  const tx = db.transaction(() => {
    if (mode === 'replace') {
      // Delete child tables first (FK order)
      db.exec(`
        DELETE FROM invoice_items;
        DELETE FROM payments;
        DELETE FROM stock_movements;
        DELETE FROM invoices;
        DELETE FROM expenses;
        DELETE FROM products;
        DELETE FROM parties;
        DELETE FROM settings;
      `);
    }

    const insert = (table, rows) => {
      if (!rows || rows.length === 0) return 0;
      let count = 0;
      for (const row of rows) {
        const cols = Object.keys(row);
        if (cols.length === 0) continue;
        const placeholders = cols.map(() => '?').join(', ');
        const values = cols.map((c) => row[c]);
        const sql = `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`;
        db.prepare(sql).run(...values);
        count++;
      }
      return count;
    };

    const counts = {};
    if (settingsRows) counts.settings = insert('settings', settingsRows);
    counts.parties = insert('parties', parsed.parties);
    counts.products = insert('products', parsed.products);
    counts.invoices = insert('invoices', parsed.invoices);
    counts.invoice_items = insert('invoice_items', parsed.invoice_items);
    counts.payments = insert('payments', parsed.payments);
    counts.expenses = insert('expenses', parsed.expenses);
    counts.stock_movements = insert('stock_movements', parsed.stock_movements);
    return counts;
  });

  return tx();
}
