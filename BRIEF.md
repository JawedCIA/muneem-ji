# Muneem Ji — Project Brief

> Drop this file in your project root. Read it fully before writing a single line of code.
> This is the source of truth for product identity, design, architecture, and feature scope.

---

## Product Identity

**Product Name:** Muneem Ji

**What it means:** "Muneem" is the traditional Hindi/Urdu word for a trusted business
accountant or bookkeeper — the person every Indian shop owner relied on completely.
The "Ji" suffix adds warmth and respect, which is exactly the emotion this product should evoke.

**Tagline:** *Aapka Digital Muneem* — Your Digital Accountant

**Tone of voice:** Warm, trustworthy, straightforward. Not corporate. Not flashy.
Like a trusted person who knows your business inside out.

**Logo:**
- Icon: A stylized open ledger/account book with a turban silhouette rising from the spine,
  forming the letter M. The turban is in amber/gold, the book in deep navy.
- Wordmark: "Muneem" in bold navy, "Ji" in amber/gold — same weight, different color.
- App icon: The icon mark alone in a rounded square, navy border, white background.
- The logo file is at `client/public/logo.png` — use it in the sidebar, invoice header,
  browser tab favicon, and the login/splash screen.

**Brand colors extracted directly from the logo:**
```
Brand navy:     #1a2b5e  — primary brand color (logo, sidebar, headings)
Brand amber:    #f5a623  — accent color (CTA buttons, "Ji" wordmark, highlights)
```

---

## What We're Building

A full-stack GST billing and business management application for Indian small businesses.
Named **Muneem Ji** — your digital trusted accountant. Self-hosted, no SaaS lock-in,
runs 100% on your own machine or a private server.
The quality bar is a real SaaS product — not a CRUD demo.

---

## Tech Stack

### Frontend
- **React 18** with Vite
- **Tailwind CSS** for styling
- **Recharts** for charts and graphs
- **Lucide React** for icons
- **@react-pdf/renderer** for PDF invoice generation
- **React Router v6** for navigation
- **Zustand** for global state management

### Backend
- **Node.js** with **Express**
- **SQLite** via `better-sqlite3` (file-based, zero setup, perfect for local use)
- **Zod** for request validation
- **express-validator** as backup
- **multer** for file uploads (logo, attachments)
- REST API — clean, resource-based routes

### Dev Tooling
- Vite dev server (frontend)
- Nodemon (backend)
- Concurrently to run both with one command: `npm run dev`

---

## Project Folder Structure

```
muneemji/
├── client/                        # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                # Shared: Button, Modal, Input, Badge, Table, etc.
│   │   │   ├── layout/            # Sidebar, Header, Layout wrapper
│   │   │   └── invoice/           # InvoiceForm, InvoicePreview, InvoicePDF
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Invoices.jsx
│   │   │   ├── Quotations.jsx
│   │   │   ├── Parties.jsx
│   │   │   ├── Products.jsx
│   │   │   ├── Expenses.jsx
│   │   │   ├── POS.jsx
│   │   │   ├── Reports.jsx
│   │   │   └── Settings.jsx
│   │   ├── store/                 # Zustand stores per domain
│   │   ├── hooks/                 # useInvoices, useParties, useProducts, etc.
│   │   ├── utils/                 # gst.js, format.js, pdf.js, validators.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   └── index.html
│
├── server/                        # Express backend
│   ├── db/
│   │   ├── schema.sql             # Full SQLite schema with indexes
│   │   ├── seed.js                # Realistic seed data
│   │   └── db.js                  # better-sqlite3 connection + migrations
│   ├── routes/
│   │   ├── invoices.js
│   │   ├── quotations.js
│   │   ├── parties.js
│   │   ├── products.js
│   │   ├── expenses.js
│   │   ├── payments.js
│   │   └── settings.js
│   ├── middleware/
│   │   ├── validate.js            # Zod validation middleware
│   │   └── errorHandler.js
│   ├── utils/
│   │   └── gstCalc.js
│   └── index.js                   # Express app entry point
│
├── package.json                   # Root — scripts only
├── client/package.json
├── server/package.json
└── BRIEF.md                       # This file
```

---

## UI/UX Design Direction

### Aesthetic
Clean, modern, high-density SaaS — the quality of **Linear.app** or **Vercel dashboard**.
Not a generic admin template. Every screen should feel intentionally designed.

### Layout
- **Fixed left sidebar** — 240px wide, brand navy (`#1a2b5e`), Muneem Ji logo at top
- **Top header** — white, 60px tall, global search bar, notification bell, business name
- **Content area** — light grey background (`#f8fafc`), padded, scrollable
- Sidebar collapses to icon-only on smaller screens
- Logo in sidebar: show full lockup (icon + wordmark) when expanded, icon only when collapsed

### Color System

All colors derived directly from the Muneem Ji logo. Do not deviate from these.

```
-- Brand (from logo)
Brand navy:         #1a2b5e  — sidebar bg, headings, logo icon color
Brand amber:        #f5a623  — primary CTA, active nav, "Ji" wordmark, highlights

-- Sidebar
Sidebar bg:         #1a2b5e  (brand navy)
Sidebar text:       #93a8d4  — muted nav labels
Sidebar active bg:  #0f1f4a  — slightly darker navy for active item
Sidebar active text:#f5a623  (brand amber)
Sidebar icon:       #ffffff  — default icons white, active icons amber

-- Actions & UI
Primary button:     #f5a623  bg, #ffffff text
Primary hover:      #e09410  (amber darkened 10%)
Secondary button:   #f1f5f9  bg, #1a2b5e text
Danger button:      #e11d48  bg, #ffffff text

-- Page & Cards
Page bg:            #f8fafc
Card bg:            #ffffff
Card border:        #e2e8f0
Card shadow:        0 1px 3px rgba(26,43,94,0.08)

-- Typography
Text primary:       #1a2b5e  (brand navy — headings feel on-brand)
Text body:          #374151
Text secondary:     #64748b
Text muted:         #94a3b8

-- Status colors
Success:            #059669
Danger:             #e11d48
Warning:            #d97706
Info:               #2563eb

-- Focus ring (inputs)
Focus ring:         #f5a623 at 40% opacity — matches brand amber
```

### Typography
- **Font**: Plus Jakarta Sans (Google Fonts) — load via `<link>` in index.html
- Display headings: 800 weight
- Section titles: 700 weight
- Body text: 400–500 weight
- Monospace (invoice numbers, GSTIN): system mono or JetBrains Mono

### Component Patterns
- **Cards**: `bg-white rounded-2xl shadow-sm border border-slate-100 p-5`
- **Buttons**: Primary = `#f5a623` amber filled, Secondary = slate-100, Danger = rose-500
- **Modals**: Slide-over panel from right for forms, center modal for confirmations
- **Tables**: Sticky header in brand navy (`#1a2b5e`), white text, zebra rows, inline action icons on row hover
- **Forms**: All inside modals/panels — no separate form pages
- **Inputs**: Rounded-xl, amber focus ring (`focus:ring-[#f5a623]`)
- **Badges**: Pill-shaped, color-coded by status
- **Empty states**: Illustrated with the Muneem Ji turban icon, friendly Hindi-flavored copy, clear CTA
- **Invoice header**: Always show Muneem Ji logo + business name side by side

### Animations
- Modal: fade-in + slide-up (150ms ease-out)
- Sidebar active item: smooth color transition
- Row hover: 100ms background transition
- Toast notifications: slide in from bottom-right, auto-dismiss in 3s
- Loading states: skeleton shimmer, not spinners

---

## Modules — Full Feature Specification

### 1. Dashboard

**KPI Cards Row** (top)
- Sales This Month — total invoice value for current calendar month
- Amount Collected — sum of paid invoices this month
- Outstanding Balance — sum of all sent + overdue invoices (all time)
- Total Expenses — sum of expenses this month

**Charts Row**
- Bar chart: Sales vs Expenses, last 6 months (Recharts BarChart)
- Donut chart: Expense breakdown by category

**Tables Row**
- Recent Invoices — last 5, with invoice no, party name, amount, status badge
- Low Stock Alerts — products where current stock <= minimum stock

---

### 2. Invoices

**List View**
- Searchable, filterable (by status, party, date range)
- Columns: Invoice No, Date, Party, Amount, GST, Status, Actions
- Bulk status update
- Export to CSV

**Create / Edit Invoice**
- Slide-over panel, full width on mobile
- Fields: Invoice No (auto, editable), Date, Due Date, Party (searchable dropdown), Status
- Interstate toggle — auto-detected from party state vs business state, manually overridable
- Line items table:
  - Pick from product catalog OR type free text
  - Columns: Item Name, HSN Code, Qty, Unit, Rate, Tax Rate (dropdown), Taxable Amt, GST Amt, Total
  - Add/remove rows dynamically
  - Tax rates: 0%, 5%, 12%, 18%, 28%
- Discount field (flat amount)
- Summary panel: Subtotal, CGST, SGST (or IGST if interstate), Discount, Grand Total
- Notes / Terms field
- Save as Draft or Save & Send

**Invoice Detail / Preview**
- Print-optimized layout (sidebar hidden, only invoice content printed)
- Download as PDF
- Share via WhatsApp (generates wa.me link with invoice number and amount)
- Record payment button — opens payment modal
- Change status dropdown

**GST Calculation Rules**
- Intrastate: CGST = taxRate/2, SGST = taxRate/2
- Interstate: IGST = taxRate
- Detection: compare party's stateCode with business stateCode from settings
- All amounts rounded to 2 decimal places

---

### 3. Quotations

- Identical to Invoices but separate number series (QUO-001, QUO-002…)
- Statuses: Draft, Sent, Accepted, Rejected, Expired
- "Convert to Invoice" button — creates invoice pre-filled with all quotation data, one click
- Expiry date field instead of due date

---

### 4. Parties (Customers & Suppliers)

**List View**
- Tabs: All / Customers / Suppliers
- Columns: Name, Type, GSTIN, Phone, City, Outstanding Balance, Actions
- Search by name, GSTIN, phone

**Party Form**
- Name, Type (Customer/Supplier), Phone, Email
- GSTIN (validate format: 15-char alphanumeric with correct checksum pattern)
- Address fields: Line 1, City, Pincode
- State (dropdown with state code — 29 Indian states)
- Opening balance (for existing parties being migrated)

**Party Detail / Ledger**
- All transactions for this party: invoices, payments, credit notes
- Running balance
- Total outstanding amount
- Payment history

---

### 5. Products & Inventory

**List View**
- Columns: Name, SKU, Category, Sale Price, Buy Price, Tax Rate, Stock, Min Stock, Actions
- Low stock rows highlighted in red-50
- Search and filter by category

**Product Form**
- Name, SKU (auto-generate or manual), Category
- Sale Price (ex-GST), Buy Price (ex-GST)
- Tax Rate (dropdown: 0, 5, 12, 18, 28)
- HSN Code (with lookup hint)
- Unit of Measurement (Nos, Pcs, Kg, Gm, Ltr, Mtr, Box, Set, Dozen)
- Current Stock, Minimum Stock (for alert threshold)
- Description (optional)

**Stock Adjustment**
- Add stock modal: qty, reason, date
- Stock history log per product

---

### 6. Expenses

**List View**
- Columns: Date, Category, Description, Vendor, Amount, Actions
- Monthly total in header
- Filter by category and date range

**Expense Form**
- Date, Category (dropdown), Description, Vendor Name, Amount, Payment Mode
- Receipt attachment (optional file upload)

**Categories**
Rent, Salaries, Utilities, Office Supplies, Travel, Marketing,
Software, Equipment, Professional Services, Other

---

### 7. POS (Point of Sale)

- Full-width layout, optimized for tablet
- Left panel: product search + grid
  - Search by name or SKU
  - Product cards with name, price, stock indicator
  - Click to add to cart
- Right panel: cart
  - Line items with qty controls (+/−)
  - Customer selector (optional — can do walk-in)
  - Discount field
  - Tax summary
  - Grand total (large, prominent)
  - Collect Payment button → payment modal (Cash / UPI / Card)
  - Print receipt button
- Receipt is thermal-style (80mm width), print-optimized CSS
- Creates an invoice in the background automatically

---

### 8. Reports

All reports have date range filters and Export to CSV button.

**Sales Register**
- All sale invoices in period
- Columns: Date, Invoice No, Party, Taxable Value, CGST, SGST, IGST, Total

**GST Summary**
- Grouped by tax rate
- Total taxable, CGST, SGST, IGST, Total Tax per rate slab
- Separate sections: Sales tax collected, Purchase tax paid (ITC)

**GSTR-1 Format**
- B2B invoices (with GSTIN), B2C invoices (without GSTIN)
- Formatted as per government GSTR-1 structure
- Export as CSV in correct column format

**Profit & Loss**
- Revenue (from paid invoices)
- Cost of Goods (buy price × qty sold, from invoice line items matched to products)
- Gross Profit
- Operating Expenses (from expenses module)
- Net Profit

**Party Ledger**
- Select party from dropdown
- Full transaction history with running balance
- Opening balance, all invoices, all payments, closing balance

**Expense Report**
- Total by category
- Month-wise breakdown
- Trend chart

---

### 9. Settings

**Business Profile**
- Business Name, Address (multi-line), City, Pincode
- State (dropdown — auto-sets state code)
- GSTIN (validated format), PAN Number
- Phone, Email, Website
- Logo upload (stored as base64 or file path, shown on invoices)

**Invoice Configuration**
- Invoice prefix (default: INV), Quotation prefix (default: QUO)
- Next invoice number (manual override)
- Default payment terms (e.g. 15 days)
- Default notes / terms & conditions
- Invoice theme (choose from 3 layouts: Classic, Modern, Minimal)

**Tax Settings**
- Default GST rate for new products
- Business type: Regular / Composition dealer

**Data Management**
- Export all data as JSON backup
- Import from JSON backup
- Clear all data (with confirmation dialog)

---

## Database Schema (SQLite)

```sql
-- Settings
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- Parties (customers + suppliers)
CREATE TABLE parties (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK(type IN ('customer', 'supplier')),
  email       TEXT,
  phone       TEXT,
  gstin       TEXT,
  address     TEXT,
  city        TEXT,
  pincode     TEXT,
  state_code  TEXT,
  state_name  TEXT,
  opening_bal REAL DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- Products / Inventory
CREATE TABLE products (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  sku         TEXT UNIQUE,
  category    TEXT,
  description TEXT,
  hsn_code    TEXT,
  unit        TEXT DEFAULT 'Nos',
  sale_price  REAL NOT NULL DEFAULT 0,
  buy_price   REAL DEFAULT 0,
  tax_rate    REAL DEFAULT 18,
  stock       REAL DEFAULT 0,
  min_stock   REAL DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- Stock adjustments log
CREATE TABLE stock_movements (
  id          TEXT PRIMARY KEY,
  product_id  TEXT NOT NULL REFERENCES products(id),
  qty         REAL NOT NULL,
  type        TEXT CHECK(type IN ('purchase', 'sale', 'adjustment', 'return')),
  reason      TEXT,
  ref_id      TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- Invoices & Quotations
CREATE TABLE invoices (
  id           TEXT PRIMARY KEY,
  no           TEXT NOT NULL UNIQUE,
  type         TEXT NOT NULL CHECK(type IN ('sale', 'purchase', 'quotation', 'credit_note')),
  date         TEXT NOT NULL,
  due_date     TEXT,
  party_id     TEXT REFERENCES parties(id),
  party_name   TEXT,
  interstate   INTEGER DEFAULT 0,
  subtotal     REAL DEFAULT 0,
  discount     REAL DEFAULT 0,
  cgst_total   REAL DEFAULT 0,
  sgst_total   REAL DEFAULT 0,
  igst_total   REAL DEFAULT 0,
  total        REAL DEFAULT 0,
  amount_paid  REAL DEFAULT 0,
  status       TEXT DEFAULT 'draft'
               CHECK(status IN ('draft','sent','paid','overdue','cancelled','accepted','rejected')),
  notes        TEXT,
  created_at   TEXT DEFAULT (datetime('now')),
  updated_at   TEXT DEFAULT (datetime('now'))
);

-- Invoice line items
CREATE TABLE invoice_items (
  id          TEXT PRIMARY KEY,
  invoice_id  TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id  TEXT REFERENCES products(id),
  name        TEXT NOT NULL,
  hsn_code    TEXT,
  qty         REAL NOT NULL DEFAULT 1,
  unit        TEXT DEFAULT 'Nos',
  rate        REAL NOT NULL DEFAULT 0,
  tax_rate    REAL DEFAULT 18,
  taxable_amt REAL DEFAULT 0,
  tax_amt     REAL DEFAULT 0,
  total       REAL DEFAULT 0,
  sort_order  INTEGER DEFAULT 0
);

-- Payments received / made
CREATE TABLE payments (
  id          TEXT PRIMARY KEY,
  invoice_id  TEXT REFERENCES invoices(id),
  party_id    TEXT REFERENCES parties(id),
  amount      REAL NOT NULL,
  date        TEXT NOT NULL,
  mode        TEXT DEFAULT 'cash'
              CHECK(mode IN ('cash','upi','card','netbanking','cheque','other')),
  reference   TEXT,
  notes       TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- Expenses
CREATE TABLE expenses (
  id          TEXT PRIMARY KEY,
  date        TEXT NOT NULL,
  category    TEXT NOT NULL,
  description TEXT,
  vendor      TEXT,
  amount      REAL NOT NULL,
  payment_mode TEXT DEFAULT 'cash',
  receipt_path TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX idx_invoices_party    ON invoices(party_id);
CREATE INDEX idx_invoices_date     ON invoices(date);
CREATE INDEX idx_invoices_status   ON invoices(status);
CREATE INDEX idx_items_invoice     ON invoice_items(invoice_id);
CREATE INDEX idx_payments_invoice  ON payments(invoice_id);
CREATE INDEX idx_expenses_date     ON expenses(date);
CREATE INDEX idx_stock_product     ON stock_movements(product_id);
```

---

## API Routes

```
GET    /api/settings                   Get all settings as key-value object
PUT    /api/settings                   Bulk update settings

GET    /api/parties                    List all parties (?type=customer|supplier&q=search)
POST   /api/parties                    Create party
GET    /api/parties/:id                Get party + ledger summary
PUT    /api/parties/:id                Update party
DELETE /api/parties/:id                Delete party

GET    /api/products                   List products (?q=search&category=X)
POST   /api/products                   Create product
PUT    /api/products/:id               Update product
DELETE /api/products/:id               Delete product
POST   /api/products/:id/adjust-stock  Add stock adjustment entry

GET    /api/invoices                   List (?type=sale|quotation&status=X&from=&to=&party=)
POST   /api/invoices                   Create invoice (also deducts stock for sales)
GET    /api/invoices/:id               Get invoice + items
PUT    /api/invoices/:id               Update invoice
DELETE /api/invoices/:id               Delete invoice
POST   /api/invoices/:id/convert       Convert quotation to invoice
PATCH  /api/invoices/:id/status        Update status only

GET    /api/payments                   List payments (?invoice_id=&party_id=)
POST   /api/payments                   Record payment (updates invoice.amount_paid + status)
DELETE /api/payments/:id               Delete payment

GET    /api/expenses                   List expenses (?from=&to=&category=)
POST   /api/expenses                   Create expense
PUT    /api/expenses/:id               Update expense
DELETE /api/expenses/:id               Delete expense

GET    /api/reports/dashboard          KPI summary for dashboard
GET    /api/reports/gst-summary        GST summary for date range
GET    /api/reports/sales-register     Sales register
GET    /api/reports/pl                 Profit & Loss
GET    /api/reports/party-ledger/:id   Full ledger for a party
```

---

## Business Logic Rules

### GST Calculation
```
taxableAmount = qty × rate
if interstate:
  igst = taxableAmount × (taxRate / 100)
  cgst = sgst = 0
else:
  cgst = taxableAmount × (taxRate / 200)
  sgst = taxableAmount × (taxRate / 200)
  igst = 0
lineTotal = taxableAmount + igst + cgst + sgst
grandTotal = sum(all lineTotals) − discount
```

### Interstate Detection
Compare `party.state_code` with `settings.stateCode`.
Different codes = interstate = IGST applies.
Always allow manual override on the invoice form.

### Invoice Numbering
`{prefix}-{padded 3-digit counter}` — e.g. `INV-001`, `INV-002`
Counter = count of invoices with same type + 1.
Allow manual edit on the form for flexibility.

### Stock Deduction
When an invoice (type=sale) is saved and status is NOT draft or cancelled:
- For each line item with a matching product_id, deduct qty from products.stock
- Create a stock_movements entry with type='sale' and ref_id=invoice.id
- On invoice delete or cancellation, reverse the stock movement

### Payment Reconciliation
When a payment is recorded:
- Add to payments table
- Recalculate invoice.amount_paid = SUM(payments where invoice_id = X)
- If amount_paid >= invoice.total: set status = 'paid'
- If amount_paid > 0 and amount_paid < invoice.total: set status = 'partial' (add this status)
- If due_date < today and amount_paid < total: status = 'overdue'

---

## Seed Data Requirements

Seed with realistic data so the app looks alive from day one:
- 5 parties (3 customers, 2 suppliers) across different states
- 10 products across 3 categories with realistic prices and HSN codes
- 12 invoices across last 3 months (mix of paid, sent, overdue)
- 5 quotations
- 10 expenses across last 2 months
- 5 payments linked to invoices
- Business settings pre-filled as a fictional but realistic Indian business:
  - Business Name: "Sharma & Sons Trading Co."
  - GSTIN: 27AABCS1429B1ZB (Maharashtra)
  - Address: 42, Nehru Market, Dadar West, Mumbai - 400028
  - The app title/branding in the UI is always "Muneem Ji" regardless of business name

---

## Quality Standards — Non-Negotiable

- **No placeholder content** — every screen works end to end
- **Form validation** — required field errors inline (not alert()), GSTIN format validated
- **Keyboard shortcuts** — `N` for new invoice, `ESC` to close modal, `/` to focus search
- **Print CSS** — when printing an invoice, hide sidebar, header, and all action buttons
- **Indian formatting** — all amounts in `₹1,23,456.00` format (Indian locale), not `$1,234,567.00`
- **Error handling** — API errors show a toast, not a white screen
- **Loading states** — skeleton loaders on initial data fetch, not empty flashes
- **Responsive** — usable on a 768px tablet (primary target after desktop)
- **Zero external auth dependency** — no login required, single-user local app
- **CORS configured** — frontend on :5173, backend on :3001, properly configured

---

## How to Run

```bash
# Install everything
npm run install:all

# Start both frontend + backend together
npm run dev

# Frontend only
npm run dev:client

# Backend only
npm run dev:server
```

Root `package.json` scripts:
```json
{
  "scripts": {
    "install:all": "npm i && cd client && npm i && cd ../server && npm i",
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:client": "cd client && npm run dev",
    "dev:server": "cd server && npm run dev"
  }
}
```

Frontend runs on `http://localhost:5173`
Backend API runs on `http://localhost:3001`

---

## Branding Checklist

Before shipping, verify these are all in place:
- [ ] Muneem Ji logo appears in sidebar (full lockup when expanded, icon-only when collapsed)
- [ ] Browser tab title is "Muneem Ji" with the turban favicon
- [ ] Invoice PDF header shows the logo + business name
- [ ] All primary buttons, active nav states, and focus rings use `#f5a623` amber
- [ ] Sidebar background is `#1a2b5e` brand navy — not black, not slate-900
- [ ] Empty state illustrations reference the Muneem Ji turban icon style
- [ ] Toast notifications and loading states match the brand palette
- [ ] Print view of invoice hides all UI chrome, shows only logo + invoice content

---

## Start Building

Read this brief fully, then follow this order:

1. Scaffold the `muneemji/` project structure above
2. Set up the SQLite schema (`schema.sql`) and run `seed.js` — confirm data is there
3. Build the Express API routes and test with a REST client
4. Build the React frontend — start with Layout (sidebar + header) using exact brand colors
5. Build Dashboard next — it's the first thing the user sees
6. Wire up each module one by one (Invoices → Parties → Products → Expenses → POS → Reports)
7. Settings page last (it's data-only, no complex UI)
8. Add print CSS for invoices
9. Run through the branding checklist above before calling it done

Do not skip the seed data. Muneem Ji should look like a real business is actively using it
from the very first `npm run dev`.
