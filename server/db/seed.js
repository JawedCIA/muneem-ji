import db, { DB_PATH } from './db.js';
import { nanoid } from 'nanoid';
import { calcInvoice, isInterstate } from '../utils/gstCalc.js';
import { fileURLToPath } from 'node:url';

const id = () => nanoid(12);

const ymd = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const today = () => new Date();
const daysAgo = (n) => { const d = today(); d.setDate(d.getDate() - n); return ymd(d); };
const daysFromNow = (n) => { const d = today(); d.setDate(d.getDate() + n); return ymd(d); };

const BUSINESS_DATA_TABLES = ['payments', 'invoice_items', 'invoices', 'stock_movements', 'expenses', 'products', 'parties'];

export function clearDemoData({ keepSettings = true } = {}) {
  const tables = keepSettings ? BUSINESS_DATA_TABLES : [...BUSINESS_DATA_TABLES, 'settings'];
  db.transaction(() => {
    tables.forEach((t) => db.prepare(`DELETE FROM ${t}`).run());
  })();
  return { cleared: tables };
}

export function isDemoDataLoaded() {
  const counts = countBusinessData();
  return counts.parties > 0 || counts.products > 0 || counts.invoices > 0;
}

export function countBusinessData() {
  return {
    parties: db.prepare('SELECT COUNT(*) c FROM parties').get().c,
    products: db.prepare('SELECT COUNT(*) c FROM products').get().c,
    invoices: db.prepare('SELECT COUNT(*) c FROM invoices').get().c,
    payments: db.prepare('SELECT COUNT(*) c FROM payments').get().c,
    expenses: db.prepare('SELECT COUNT(*) c FROM expenses').get().c,
  };
}

export function seedDemoData({ keepSettings = false } = {}) {
  // Wipe business data first (preserve users always; settings optional)
  clearDemoData({ keepSettings });

  // ---------- Settings ----------
  if (!keepSettings) {
    const businessStateCode = '27';
    const settings = {
      businessName: 'Sharma & Sons Trading Co.',
      address: '42, Nehru Market, Dadar West',
      city: 'Mumbai',
      pincode: '400028',
      stateCode: businessStateCode,
      stateName: 'Maharashtra',
      gstin: '27AABCS1429B1ZB',
      pan: 'AABCS1429B',
      phone: '+91 98200 12345',
      email: 'accounts@sharmasons.in',
      website: 'www.sharmasons.in',
      invoicePrefix: 'INV',
      quotationPrefix: 'QUO',
      paymentTerms: '15',
      defaultNotes: 'Thank you for your business. Goods once sold will not be taken back.',
      invoiceTheme: 'modern',
      defaultTaxRate: '18',
      businessType: 'regular',
    };
    const upsert = db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value`);
    db.transaction(() => {
      for (const [k, v] of Object.entries(settings)) upsert.run(k, String(v));
    })();
  }

  // Resolve business state code (whether we just set it or it was kept)
  const businessStateCode = db.prepare("SELECT value FROM settings WHERE key = 'stateCode'").get()?.value || '27';

  // ---------- Parties ----------
  const parties = [
    { id: id(), name: 'Patel Hardware Stores', type: 'customer',
      email: 'arvind@patelhardware.in', phone: '+91 99876 54321',
      gstin: '27AAFCP4567K1Z9', address: 'Shop 12, Linking Road',
      city: 'Mumbai', pincode: '400050', state_code: '27', state_name: 'Maharashtra', opening_bal: 0 },
    { id: id(), name: 'Krishna Electronics Pvt Ltd', type: 'customer',
      email: 'sales@krishnaelectronics.in', phone: '+91 98300 11122',
      gstin: '29AABCK7890M1ZQ', address: '85, MG Road',
      city: 'Bengaluru', pincode: '560001', state_code: '29', state_name: 'Karnataka', opening_bal: 12500 },
    { id: id(), name: 'Goyal Trading Co.', type: 'customer',
      email: 'rakesh@goyaltrading.in', phone: '+91 99100 33445',
      gstin: '07AAACG3344N1Z2', address: '21, Karol Bagh',
      city: 'New Delhi', pincode: '110005', state_code: '07', state_name: 'Delhi', opening_bal: 0 },
    { id: id(), name: 'Mehta Wholesale Distributors', type: 'supplier',
      email: 'orders@mehtawholesale.in', phone: '+91 98765 00112',
      gstin: '24AABCM7766P1ZK', address: '5, Ring Road, Navrangpura',
      city: 'Ahmedabad', pincode: '380009', state_code: '24', state_name: 'Gujarat', opening_bal: 0 },
    { id: id(), name: 'Singh Steel Suppliers', type: 'supplier',
      email: 'gurpreet@singhsteel.in', phone: '+91 98140 99887',
      gstin: '03AAJCS5566Q1Z7', address: 'Industrial Area, Phase 8',
      city: 'Mohali', pincode: '160055', state_code: '03', state_name: 'Punjab', opening_bal: 0 },
  ];

  const insParty = db.prepare(`INSERT INTO parties
    (id, name, type, email, phone, gstin, address, city, pincode, state_code, state_name, opening_bal)
    VALUES (@id, @name, @type, @email, @phone, @gstin, @address, @city, @pincode, @state_code, @state_name, @opening_bal)`);
  db.transaction(() => parties.forEach((p) => insParty.run(p)))();

  // ---------- Products ----------
  const products = [
    { id: id(), name: 'Wireless Mouse - Logitech M170', sku: 'ELE-001', category: 'Electronics', hsn_code: '8471', unit: 'Nos', sale_price: 749, buy_price: 520, tax_rate: 18, stock: 42, min_stock: 10, description: 'Compact wireless mouse, 1 year battery' },
    { id: id(), name: 'USB-C Charging Cable 1m', sku: 'ELE-002', category: 'Electronics', hsn_code: '8544', unit: 'Nos', sale_price: 199, buy_price: 95, tax_rate: 18, stock: 120, min_stock: 25, description: 'Braided USB-C cable, 60W support' },
    { id: id(), name: 'Power Strip 6-Socket Surge', sku: 'ELE-003', category: 'Electronics', hsn_code: '8536', unit: 'Nos', sale_price: 599, buy_price: 380, tax_rate: 18, stock: 8, min_stock: 12, description: '6-socket extension with surge protection' },
    { id: id(), name: 'LED Bulb 9W Cool White', sku: 'ELE-004', category: 'Electronics', hsn_code: '8539', unit: 'Nos', sale_price: 110, buy_price: 65, tax_rate: 12, stock: 200, min_stock: 50, description: 'Energy-efficient LED bulb, 9W' },
    { id: id(), name: 'A4 Copier Paper 500 Sheets', sku: 'STA-001', category: 'Stationery', hsn_code: '4802', unit: 'Box', sale_price: 320, buy_price: 245, tax_rate: 12, stock: 35, min_stock: 10, description: '75 GSM premium copier paper' },
    { id: id(), name: 'Ball Pen Blue (Pack of 10)', sku: 'STA-002', category: 'Stationery', hsn_code: '9608', unit: 'Pcs', sale_price: 80, buy_price: 50, tax_rate: 12, stock: 5, min_stock: 15, description: 'Smooth-flow blue ink ball pens' },
    { id: id(), name: 'Stapler Heavy Duty', sku: 'STA-003', category: 'Stationery', hsn_code: '8305', unit: 'Nos', sale_price: 250, buy_price: 160, tax_rate: 18, stock: 22, min_stock: 5, description: 'Metal body, 25-sheet capacity' },
    { id: id(), name: 'Mild Steel Screws 1 inch (100 pcs)', sku: 'HRD-001', category: 'Hardware', hsn_code: '7318', unit: 'Box', sale_price: 180, buy_price: 110, tax_rate: 18, stock: 60, min_stock: 15, description: 'Self-tapping mild steel screws' },
    { id: id(), name: 'PVC Pipe 1/2 inch (3m)', sku: 'HRD-002', category: 'Hardware', hsn_code: '3917', unit: 'Mtr', sale_price: 145, buy_price: 90, tax_rate: 18, stock: 75, min_stock: 20, description: 'PVC plumbing pipe, 1/2 inch diameter' },
    { id: id(), name: 'Wall Putty 5kg', sku: 'HRD-003', category: 'Hardware', hsn_code: '3214', unit: 'Box', sale_price: 425, buy_price: 290, tax_rate: 28, stock: 18, min_stock: 8, description: 'White cement based wall putty' },
  ];

  const insProduct = db.prepare(`INSERT INTO products
    (id, name, sku, category, description, hsn_code, unit, sale_price, buy_price, tax_rate, stock, min_stock)
    VALUES (@id, @name, @sku, @category, @description, @hsn_code, @unit, @sale_price, @buy_price, @tax_rate, @stock, @min_stock)`);
  db.transaction(() => products.forEach((p) => insProduct.run(p)))();

  // ---------- Invoices + Quotations ----------
  const insInvoice = db.prepare(`INSERT INTO invoices
    (id, no, type, date, due_date, party_id, party_name, interstate, subtotal, discount, cgst_total, sgst_total, igst_total, total, amount_paid, status, notes)
    VALUES (@id, @no, @type, @date, @due_date, @party_id, @party_name, @interstate, @subtotal, @discount, @cgst_total, @sgst_total, @igst_total, @total, @amount_paid, @status, @notes)`);
  const insItem = db.prepare(`INSERT INTO invoice_items
    (id, invoice_id, product_id, name, hsn_code, qty, unit, rate, tax_rate, taxable_amt, tax_amt, total, sort_order)
    VALUES (@id, @invoice_id, @product_id, @name, @hsn_code, @qty, @unit, @rate, @tax_rate, @taxable_amt, @tax_amt, @total, @sort_order)`);
  const insStockMv = db.prepare(`INSERT INTO stock_movements
    (id, product_id, qty, type, reason, ref_id) VALUES (?, ?, ?, ?, ?, ?)`);
  const updProductStock = db.prepare(`UPDATE products SET stock = stock - ? WHERE id = ?`);

  function buildInvoice({ no, type, daysBack, dueOffset, partyIdx, picks, status, discount = 0, notes = '' }) {
    const party = parties[partyIdx];
    const inter = isInterstate(party.state_code, businessStateCode);
    const items = picks.map((pk, i) => {
      const prod = products[pk.p];
      return {
        product_id: prod.id,
        name: prod.name,
        hsn_code: prod.hsn_code,
        qty: pk.qty,
        unit: prod.unit,
        rate: pk.rate ?? prod.sale_price,
        tax_rate: prod.tax_rate,
        sort_order: i,
      };
    });
    const calc = calcInvoice({ items, discount, interstate: inter });
    const invId = id();
    const date = daysAgo(daysBack);
    const due = dueOffset != null ? daysFromNow(dueOffset) : daysAgo(daysBack - 15);
    const inv = {
      id: invId, no, type, date, due_date: due,
      party_id: party.id, party_name: party.name,
      interstate: inter ? 1 : 0,
      subtotal: calc.subtotal, discount: calc.discount,
      cgst_total: calc.cgst_total, sgst_total: calc.sgst_total, igst_total: calc.igst_total,
      total: calc.total,
      amount_paid: status === 'paid' ? calc.total : 0,
      status, notes,
    };
    insInvoice.run(inv);
    calc.items.forEach((it) => {
      insItem.run({
        id: id(), invoice_id: invId, product_id: it.product_id,
        name: it.name, hsn_code: it.hsn_code, qty: it.qty, unit: it.unit, rate: it.rate,
        tax_rate: it.tax_rate, taxable_amt: it.taxable_amt, tax_amt: it.tax_amt,
        total: it.total, sort_order: it.sort_order,
      });
    });
    if (type === 'sale' && !['draft', 'cancelled'].includes(status)) {
      calc.items.forEach((it) => {
        if (it.product_id) {
          updProductStock.run(it.qty, it.product_id);
          insStockMv.run(id(), it.product_id, -it.qty, 'sale', `Invoice ${no}`, invId);
        }
      });
    }
    return inv;
  }

  db.transaction(() => {
    buildInvoice({ no: 'INV-001', type: 'sale', daysBack: 88, dueOffset: -73, partyIdx: 0, status: 'paid', picks: [{ p: 0, qty: 5 }, { p: 1, qty: 10 }] });
    buildInvoice({ no: 'INV-002', type: 'sale', daysBack: 80, dueOffset: -65, partyIdx: 1, status: 'paid', picks: [{ p: 4, qty: 8 }, { p: 6, qty: 4 }] });
    buildInvoice({ no: 'INV-003', type: 'sale', daysBack: 72, dueOffset: -57, partyIdx: 2, status: 'paid', picks: [{ p: 7, qty: 12 }, { p: 8, qty: 25 }] });
    buildInvoice({ no: 'INV-004', type: 'sale', daysBack: 60, dueOffset: -45, partyIdx: 0, status: 'overdue', picks: [{ p: 2, qty: 3 }, { p: 3, qty: 20 }] });
    buildInvoice({ no: 'INV-005', type: 'sale', daysBack: 52, dueOffset: -37, partyIdx: 1, status: 'paid', picks: [{ p: 0, qty: 6 }, { p: 9, qty: 4 }] });
    buildInvoice({ no: 'INV-006', type: 'sale', daysBack: 45, dueOffset: -30, partyIdx: 2, status: 'overdue', picks: [{ p: 5, qty: 50 }, { p: 6, qty: 10 }] });
    buildInvoice({ no: 'INV-007', type: 'sale', daysBack: 35, dueOffset: -20, partyIdx: 0, status: 'paid', picks: [{ p: 3, qty: 30 }, { p: 4, qty: 5 }] });
    buildInvoice({ no: 'INV-008', type: 'sale', daysBack: 28, dueOffset: -13, partyIdx: 1, status: 'sent', picks: [{ p: 0, qty: 4 }, { p: 1, qty: 15 }, { p: 2, qty: 2 }] });
    buildInvoice({ no: 'INV-009', type: 'sale', daysBack: 18, dueOffset: -3, partyIdx: 2, status: 'sent', picks: [{ p: 7, qty: 20 }, { p: 8, qty: 30 }, { p: 9, qty: 6 }] });
    buildInvoice({ no: 'INV-010', type: 'sale', daysBack: 12, dueOffset: 3, partyIdx: 0, status: 'sent', discount: 50, picks: [{ p: 5, qty: 25 }, { p: 6, qty: 8 }] });
    buildInvoice({ no: 'INV-011', type: 'sale', daysBack: 6, dueOffset: 9, partyIdx: 1, status: 'sent', picks: [{ p: 0, qty: 10 }, { p: 4, qty: 12 }] });
    buildInvoice({ no: 'INV-012', type: 'sale', daysBack: 2, dueOffset: 13, partyIdx: 2, status: 'draft', picks: [{ p: 8, qty: 40 }, { p: 9, qty: 12 }] });

    buildInvoice({ no: 'QUO-001', type: 'quotation', daysBack: 25, dueOffset: 5, partyIdx: 0, status: 'accepted', picks: [{ p: 0, qty: 12 }, { p: 1, qty: 25 }] });
    buildInvoice({ no: 'QUO-002', type: 'quotation', daysBack: 18, dueOffset: 12, partyIdx: 1, status: 'sent', picks: [{ p: 2, qty: 5 }, { p: 4, qty: 20 }] });
    buildInvoice({ no: 'QUO-003', type: 'quotation', daysBack: 12, dueOffset: 18, partyIdx: 2, status: 'sent', picks: [{ p: 7, qty: 50 }, { p: 8, qty: 100 }] });
    buildInvoice({ no: 'QUO-004', type: 'quotation', daysBack: 8, dueOffset: 22, partyIdx: 0, status: 'rejected', picks: [{ p: 9, qty: 15 }] });
    buildInvoice({ no: 'QUO-005', type: 'quotation', daysBack: 3, dueOffset: 27, partyIdx: 1, status: 'draft', picks: [{ p: 3, qty: 40 }, { p: 5, qty: 8 }] });
  })();

  // ---------- Payments ----------
  const insPay = db.prepare(`INSERT INTO payments
    (id, invoice_id, party_id, amount, date, mode, reference, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  const paidInvoices = db.prepare(`SELECT id, party_id, total, date FROM invoices WHERE status = 'paid' AND type = 'sale' LIMIT 5`).all();
  db.transaction(() => {
    paidInvoices.forEach((inv, i) => {
      const modes = ['upi', 'cash', 'netbanking', 'cheque', 'card'];
      insPay.run(id(), inv.id, inv.party_id, inv.total, inv.date, modes[i % modes.length], `TXN-${1000 + i}`, 'Auto-recorded via demo data');
    });
  })();

  // ---------- Expenses ----------
  const insExp = db.prepare(`INSERT INTO expenses
    (id, date, category, description, vendor, amount, payment_mode)
    VALUES (?, ?, ?, ?, ?, ?, ?)`);
  const expenses = [
    [50, 'Rent', 'Monthly shop rent — March', 'Mahesh Kapoor', 35000, 'netbanking'],
    [48, 'Salaries', 'Salary - Ramesh (assistant)', 'Ramesh Kumar', 18000, 'cash'],
    [45, 'Utilities', 'Electricity bill', 'BEST Mumbai', 4250, 'upi'],
    [40, 'Office Supplies', 'Printer ink + cartridges', 'Cartridge World', 1850, 'card'],
    [32, 'Travel', 'Auto fares for deliveries', 'Various', 720, 'cash'],
    [25, 'Marketing', 'Pamphlet printing', 'Quick Print Services', 2400, 'cash'],
    [20, 'Rent', 'Monthly shop rent — April', 'Mahesh Kapoor', 35000, 'netbanking'],
    [15, 'Software', 'Tally subscription renewal', 'Tally Solutions', 7200, 'netbanking'],
    [10, 'Utilities', 'Internet + phone bill', 'Jio Fiber', 1499, 'upi'],
    [4, 'Professional Services', 'CA fees - GSTR filing', 'Anand Joshi & Co', 5000, 'upi'],
  ];
  db.transaction(() => {
    expenses.forEach(([d, cat, desc, vendor, amt, mode]) => {
      insExp.run(id(), daysAgo(d), cat, desc, vendor, amt, mode);
    });
  })();

  return countBusinessData();
}

// CLI behaviour: only when run directly via `node db/seed.js`
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  if (process.env.NODE_ENV === 'production' && process.env.SEED_FORCE !== '1') {
    console.error('[seed] Refusing to run in production. Set SEED_FORCE=1 to override (will WIPE business data).');
    process.exit(1);
  }
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (userCount > 0 && process.env.SEED_FORCE !== '1') {
    console.error(`[seed] ${userCount} user(s) already exist. Refusing to wipe data.`);
    console.error('       Use the in-app "Load Demo Data" button (Settings → Data Management),');
    console.error('       or set SEED_FORCE=1 to override (wipes business data, keeps users).');
    process.exit(1);
  }
  console.log('Seeding Muneem Ji database at', DB_PATH);
  const counts = seedDemoData({ keepSettings: false });
  console.log('Seed complete:', counts);
  process.exit(0);
}
