<div align="center">

<img src="logo.png" alt="Muneem Ji" width="120" />

# Muneem Ji
### *Aapka Digital Muneem* — Your Digital Accountant

**Self-hosted GST billing & business management for Indian small businesses.**

No SaaS subscriptions. No vendor lock-in. Runs 100% on your own machine or private server.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#license)
![Node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/react-18-61dafb?logo=react&logoColor=white)
![Express](https://img.shields.io/badge/express-4-000000?logo=express&logoColor=white)
![SQLite](https://img.shields.io/badge/sqlite-3-003b57?logo=sqlite&logoColor=white)
![Tailwind](https://img.shields.io/badge/tailwindcss-3-38bdf8?logo=tailwindcss&logoColor=white)

Built and maintained by **[mannatai.com](https://mannatai.com)**

</div>

---

## What is Muneem Ji?

**Muneem** is the traditional Hindi/Urdu word for a trusted business accountant — the person every Indian shop owner relied on completely. The **Ji** suffix adds warmth and respect.

Muneem Ji is a complete, modern, GST-compliant billing and accounting application designed specifically for the way Indian SMBs actually run their books. Think of it as your trusted digital bookkeeper that lives on your laptop or office server.

## Why I built this

A while back I visited my cousin's small shop in Bihar. Like most shops in small-town India, the day was a beautiful chaos — customers walking in for everything from a single soap bar to a month's groceries on credit, a notebook with running balances scribbled in the margins, a calculator with worn-out keys, and a phone constantly buzzing with WhatsApp orders.

I asked him why he didn't use any of the popular billing apps. His answer stuck with me:

> "Bhaiya, sab cloud pe hai. Internet jaaye toh dukaan band. Subscription bhi har saal badhta jaata hai. Aur unke menu English mein hai, mere staff ko samajh nahi aata. Aur sabse badi baat — meri customer list, meri sales — sab unke server pe. Mera apna data mere paas hi nahi."
>
> *("Brother, everything is on the cloud. Internet goes down — shop stops. Subscriptions keep going up every year. Their menus are in English, my staff doesn't understand them. And the biggest thing — my customer list, my sales — all on their server. My own data isn't even with me.")*

That conversation became Muneem Ji.

I wanted something that:
- **Runs on his laptop or a small server in his shop** — works without internet, no monthly fee, no surprise price hikes
- **Speaks his language** — Hinglish where it matters, Indian number formatting (₹1,23,456), Indian state-wise GST handling out of the box
- **Looks like a real shop tool** — quick POS for the counter, proper GST invoices for B2B customers, WhatsApp sharing because that's how India actually sends bills
- **Belongs to him** — his data lives on his disk. He can back it up, copy it, take it anywhere. No vendor can shut him out

If you're a shop owner, a developer building for one, or just someone who believes small businesses deserve software that respects them — welcome. This is for you. Use it, fork it, ship it to the shop next door.

## Features

### Core
- **Serial / IMEI tracking + warranty register** — toggle "Has serial numbers" on a product (electronics, mobile, jewellery, auto parts) and every unit sold is captured individually. Warranty period rolls forward from the invoice date. Search any serial across the lifetime of the shop, see which customer / invoice / date it ties back to, and at a glance know whether warranty is active, expiring within 30 days, expired, or unset.
- **GST toggle** — registered businesses get full GST behaviour (CGST/SGST/IGST splits, GSTR-1/3B export, HSN columns); below-threshold shops can turn GST off in one click and the invoice / POS / reports adjust automatically (no GSTIN required, no tax columns, simple "Item / Qty / Rate / Total" bills)
- **GST-compliant invoicing** — automatic CGST/SGST/IGST split based on party state vs. business state
- **Quotations** with one-click "Convert to Invoice"
- **Parties** — customers & suppliers with GSTIN, addresses across all 29 Indian states + UTs
- **Products & Inventory** — auto-deducting stock on sales, low-stock alerts, stock movement history
- **Expenses** — categorised, with receipt attachments
- **POS** — tablet-friendly point-of-sale with thermal-style 80mm receipts
- **Payments** — partial/full payments with auto status reconciliation (paid/partial/overdue)

### Reports
- Dashboard with KPIs and 6-month trend charts
- Sales Register, GST Summary (rate-wise)
- **GSTR-1 returns** — full B2B, B2CL, B2CS, CDNR, CDNUR, HSN summary, and Documents-Issued sections; per-section CSV download in the Tally / GSTN offline-tool format; warnings flag missing HSN codes and orphan credit notes before you file
- **GSTR-3B summary** — 3.1(a), 3.1(c), 3.2, 4(A)(5) ITC, and 6.1 tax-payable; read-off-and-type into the GST portal
- Profit & Loss with COGS calculation
- Party Ledger with running balance
- Expense report with monthly trend
- Every report exportable to CSV

### Built for the way you work
- **Indian number formatting** — `₹1,23,456.00`, not `$1,234,567.00`
- **Print-optimized invoices** — A4 layout, sidebar/chrome hidden, ready for sharing
- **PDF download** via `@react-pdf/renderer`
- **Public share links** — every invoice/quotation has a 128-bit share token; customers can open `/i/:token` or `/q/:token` without logging in (rate-limited, branding-whitelisted, read-only)
- **WhatsApp share** — pre-fills a `wa.me` message with the share link and an editable per-shop template; on mobile (Android Chrome / iOS 15.4+) the OS share sheet attaches the PDF natively to WhatsApp
- **Audit log** — every mutating action is recorded with actor, before/after JSON, and auto-redaction of password / token fields
- **Period lock** — close an accounting period in Settings to prevent edits to dates inside it (HTTP 423)
- **Two-factor auth** — RFC 6238 TOTP, QR enrolment, backup codes, two-stage login (no external dep)
- **Recurring invoices** — weekly / monthly / quarterly / yearly templates, hourly scheduler, manual run + pause/resume
- **Bank reconciliation** — CSV import with auto column-detection (HDFC / ICICI / SBI variants), match against payments or expenses
- **Keyboard shortcuts** — `N` for new invoice, `/` to search, `Esc` to close
- **Skeleton loaders** instead of empty flashes
- **Toast notifications** instead of jarring `alert()` boxes

## Screenshots

> _Add screenshots to a `docs/screenshots/` folder and reference them here._
>
> Suggested shots: Dashboard, Invoice list, Invoice detail/print preview, POS, Reports, Mobile view.

## Tech Stack

| Layer        | Technology                                           |
| ------------ | ---------------------------------------------------- |
| **Frontend** | React 18, Vite, Tailwind CSS, Recharts, Lucide React, Zustand, React Router v6, @react-pdf/renderer |
| **Backend**  | Node.js, Express, better-sqlite3, Zod, Multer, Morgan |
| **Database** | SQLite (file-based — zero setup)                     |
| **Dev tools**| Vite dev server, Nodemon, Concurrently               |

## Quick Start

### For shop owners — one-command install (Docker)

The fastest way to get a real shop running. Requires only [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac) or Docker Engine (Linux).

```bash
git clone https://github.com/JawedCIA/muneem-ji.git
cd muneem-ji
docker compose up -d
```

Open **http://localhost:3001** — you'll be walked through a one-time setup wizard:

1. Create your admin account (email + password)
2. Fill in your business profile (name, GSTIN, address, state)
3. Land on an empty Dashboard — ready to add your first party / product / invoice

All data is stored in a Docker volume (`muneemji-data`) — your invoices survive container restarts and updates.

```bash
docker compose logs -f          # tail logs
docker compose down             # stop (data preserved)
docker compose down -v          # stop AND DELETE all data (irreversible)
```

To customise the public port, JWT secret, CORS origin, or backup schedule, copy `.env.example` to `.env` and edit. See [Production Deployment](#production-deployment) below.

### For developers — local setup (Node)

#### Prerequisites
- **Node.js 18+** and **npm 9+**
- Windows, macOS, or Linux

```bash
git clone https://github.com/JawedCIA/muneem-ji.git
cd muneem-ji
npm run install:all          # install root + client + server deps
npm run dev                  # start frontend (5173) + backend (3001)
```

Open **http://localhost:5173** — you'll see the first-run setup wizard.

| Service          | URL                       |
| ---------------- | ------------------------- |
| Frontend (Vite)  | `http://localhost:5173`   |
| Backend API      | `http://localhost:3001`   |
| Health check     | `http://localhost:3001/api/health` |

#### Other scripts
```bash
npm run dev:client   # frontend only
npm run dev:server   # backend only
npm run seed         # load demo data — refuses to run if a user exists or NODE_ENV=production
npm run build        # build the React client to client/dist
npm start            # start in production mode (Express serves API + client/dist)
```

> **Heads-up:** `npm run seed` now refuses to run once any user account exists. To reset a dev database, delete `server/db/muneemji.sqlite*` first, then run `npm run seed`.

## Project Structure

```
muneem-ji/
├── client/                        # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                # Shared: Button, Modal, Input, Badge, Table…
│   │   │   ├── layout/            # Sidebar, Header, Layout wrapper
│   │   │   └── invoice/           # InvoiceForm, InvoicePreview, WhatsAppShareDialog
│   │   ├── pages/                 # Dashboard, Invoices, POS, Reports, Settings,
│   │   │                          # PublicInvoice (read-only share view)…
│   │   ├── store/                 # Zustand stores (settings, toast)
│   │   ├── utils/                 # api, format (Indian ₹), gst, validators, pdf,
│   │   │                          # whatsapp, share (Web Share API)
│   │   └── App.jsx
│   ├── public/logo.png
│   └── index.html
│
├── server/                        # Express backend
│   ├── db/
│   │   ├── migrations/            # Forward-only NNN_*.sql (auto-applied on boot)
│   │   ├── migrate.js             # Migration runner with checksum drift detection
│   │   ├── seed.js                # Realistic seed data (refuses if a user exists)
│   │   └── db.js                  # better-sqlite3 connection
│   ├── routes/                    # auth, parties, products, invoices, payments,
│   │                              # expenses, reports, settings, recurring, bank,
│   │                              # audit, backup, public (share-link viewer)
│   ├── middleware/                # Zod validation, requireAuth, error handler
│   ├── utils/                     # gstCalc, audit, periodLock, pagination, totp
│   ├── test/e2e.mjs               # 118 end-to-end smoke scenarios
│   └── index.js                   # Express app entry
│
├── Dockerfile, docker-compose.yml # Single image: Express serves API + React
├── .env.example                   # Documented production environment vars
├── package.json                   # Root scripts (dev / install:all / docker:*)
├── BRIEF.md                       # Original product brief
├── CHANGELOG.md, CONTRIBUTING.md, SECURITY.md
└── .github/                       # Issue + PR templates
```

## API Reference

All routes are under `/api`. Returns JSON. CORS allows `http://localhost:5173` by default. Every route except `/api/health`, `/api/auth/status`, `/api/auth/setup`, `/api/auth/login`, and `/api/public/*` requires a valid session cookie.

### Auth
| Method | Path                                  | Description                                |
| ------ | ------------------------------------- | ------------------------------------------ |
| GET    | `/api/auth/status`                    | `{ setupRequired: bool }` — public         |
| POST   | `/api/auth/setup`                     | First-run admin creation (no users → 201)  |
| POST   | `/api/auth/login`                     | Set session cookie (rate-limited)          |
| POST   | `/api/auth/logout`                    | Clear session cookie                       |
| GET    | `/api/auth/me`                        | Current user                               |
| POST   | `/api/auth/change-password`           | Change own password                        |
| GET    | `/api/auth/users`                     | List users (admin)                         |
| POST   | `/api/auth/users`                     | Create user (admin)                        |
| PUT    | `/api/auth/users/:id`                 | Update name/role/active/password (admin)   |
| DELETE | `/api/auth/users/:id`                 | Delete user (admin, can't be self/last)    |
| POST   | `/api/auth/2fa/setup`                 | Begin TOTP enrolment (returns secret + QR) |
| POST   | `/api/auth/2fa/enable`                | Confirm enrolment with a 6-digit code      |
| POST   | `/api/auth/2fa/disable`               | Disable TOTP for self                      |
| GET    | `/api/auth/2fa/status`                | Whether the current user has TOTP enabled  |

### Public (no auth, rate-limited)
| Method | Path                                  | Description                                          |
| ------ | ------------------------------------- | ---------------------------------------------------- |
| GET    | `/api/public/invoice/:token`          | Read-only invoice by share token (with branding)     |
| GET    | `/api/public/quotation/:token`        | Read-only quotation by share token (with branding)   |

### Backup
| Method | Path                                  | Description                                |
| ------ | ------------------------------------- | ------------------------------------------ |
| GET    | `/api/backup/export`                  | Download full JSON backup                  |
| POST   | `/api/backup/import`                  | Restore from uploaded JSON (admin)         |
| GET    | `/api/backup/list`                    | List server-side auto-backups (admin)      |
| POST   | `/api/backup/run-now`                 | Trigger an immediate snapshot (admin)      |
| GET    | `/api/backup/download/:name`          | Download a stored auto-backup (admin)      |

### Business data
| Method | Path                                  | Description                                |
| ------ | ------------------------------------- | ------------------------------------------ |
| GET    | `/api/settings`                       | Get all settings                           |
| PUT    | `/api/settings`                       | Bulk update settings                       |
| GET    | `/api/parties?type=&q=`               | List parties                               |
| POST   | `/api/parties`                        | Create party                               |
| GET    | `/api/parties/:id`                    | Party + invoices + payments                |
| PUT    | `/api/parties/:id`                    | Update party                               |
| DELETE | `/api/parties/:id`                    | Delete party                               |
| GET    | `/api/products?q=&category=`          | List products                              |
| POST   | `/api/products`                       | Create product                             |
| PUT    | `/api/products/:id`                   | Update product                             |
| DELETE | `/api/products/:id`                   | Delete product                             |
| POST   | `/api/products/:id/adjust-stock`      | Add stock adjustment                       |
| GET    | `/api/invoices?type=&status=&from=&to=&party=` | List invoices                  |
| POST   | `/api/invoices`                       | Create invoice (deducts stock for sales)   |
| GET    | `/api/invoices/:id`                   | Invoice + items + payments                 |
| PUT    | `/api/invoices/:id`                   | Update invoice                             |
| DELETE | `/api/invoices/:id`                   | Delete invoice (reverses stock)            |
| PATCH  | `/api/invoices/:id/status`            | Update status                              |
| POST   | `/api/invoices/:id/convert`           | Convert quotation → invoice                |
| POST   | `/api/invoices/:id/share`             | Log a share event (channel + recipient)    |
| GET    | `/api/payments?invoice_id=&party_id=` | List payments                              |
| POST   | `/api/payments`                       | Record payment                             |
| DELETE | `/api/payments/:id`                   | Delete payment                             |
| GET    | `/api/expenses?from=&to=&category=`   | List expenses                              |
| POST   | `/api/expenses`                       | Create expense (multipart for receipt)     |
| PUT    | `/api/expenses/:id`                   | Update expense                             |
| DELETE | `/api/expenses/:id`                   | Delete expense                             |
| GET    | `/api/reports/dashboard`              | Dashboard KPIs + charts                    |
| GET    | `/api/reports/sales-register`         | Sales register                             |
| GET    | `/api/reports/gst-summary`            | GST summary by tax rate                    |
| GET    | `/api/reports/pl`                     | Profit & Loss                              |
| GET    | `/api/reports/party-ledger/:id`       | Party ledger with running balance          |
| GET    | `/api/reports/expense-summary`        | Expense breakdown                          |

### Serials & Warranty
| Method | Path                                  | Description                                          |
| ------ | ------------------------------------- | ---------------------------------------------------- |
| GET    | `/api/serials?q=&status=&product_id=` | Paginated serial register; status = active/expiring/expired/unknown |
| GET    | `/api/serials/lookup/:serial`         | Find a single serial (case-insensitive) with invoice + party context |
| GET    | `/api/serials/stats`                  | Counts by warranty status — drives the Serials page header |
| GET    | `/api/reports/gstr1?period=YYYY-MM`   | GSTR-1 sections (B2B, B2CL, B2CS, CDNR, CDNUR, HSN, DOCS) + counts/totals/warnings |
| GET    | `/api/reports/gstr1/csv?period=YYYY-MM&section=b2b\|b2cl\|b2cs\|cdnr\|cdnur\|hsn\|docs` | Tally-compatible CSV per section |
| GET    | `/api/reports/gstr3b?period=YYYY-MM`  | GSTR-3B summary (3.1a, 3.1c, 3.2, 4 ITC, 6.1 payable) |

### Recurring invoices
| Method | Path                                  | Description                                          |
| ------ | ------------------------------------- | ---------------------------------------------------- |
| GET    | `/api/recurring`                      | List recurring templates                             |
| POST   | `/api/recurring`                      | Create template (frequency, next_run, etc.)         |
| GET    | `/api/recurring/:id`                  | Template detail                                      |
| PUT    | `/api/recurring/:id`                  | Update template                                      |
| DELETE | `/api/recurring/:id`                  | Delete template                                      |
| POST   | `/api/recurring/:id/run`              | Generate the next invoice now                        |
| POST   | `/api/recurring/:id/pause`            | Pause the schedule                                   |
| POST   | `/api/recurring/:id/resume`           | Resume the schedule                                  |

### Bank reconciliation
| Method | Path                                  | Description                                          |
| ------ | ------------------------------------- | ---------------------------------------------------- |
| GET    | `/api/bank/accounts`                  | List bank accounts                                   |
| POST   | `/api/bank/accounts`                  | Create bank account                                  |
| PUT    | `/api/bank/accounts/:id`              | Update bank account                                  |
| DELETE | `/api/bank/accounts/:id`              | Delete bank account                                  |
| POST   | `/api/bank/peek`                      | Preview a CSV statement (column auto-detect)         |
| POST   | `/api/bank/import`                    | Import a CSV statement into bank_lines               |
| GET    | `/api/bank/lines`                     | List statement lines (filter by account/date/match)  |
| DELETE | `/api/bank/lines/:id`                 | Delete a single statement line                       |
| POST   | `/api/bank/match`                     | Match a line to a payment or expense                 |
| DELETE | `/api/bank/match/:id`                 | Unmatch                                              |
| GET    | `/api/bank/suggestions/:line_id`      | ±0.01 / ±7-day match suggestions for a line          |

### Audit log
| Method | Path                                  | Description                                          |
| ------ | ------------------------------------- | ---------------------------------------------------- |
| GET    | `/api/audit`                          | Paginated audit entries (filters: actor, entity, …)  |
| GET    | `/api/audit/facets`                   | Distinct actors / entities / actions for filter UI   |
| GET    | `/api/audit/csv`                      | CSV export of the filtered query                     |

## GST Returns (GSTR-1 / GSTR-3B)

Open **Reports → GSTR-1 Returns** or **GSTR-3B Summary**, pick the filing month, and review every section before exporting.

### What's classified where

| Section   | Rule (sales + status not in draft/cancelled) |
| --------- | -------------------------------------------- |
| **B2B**   | Party has a valid 15-char GSTIN — one row per (invoice, tax-rate). |
| **B2CL**  | Party has no GSTIN, interstate, **invoice value > B2CL threshold** (default ₹1,00,000, configurable via the `b2clThreshold` setting). |
| **B2CS**  | Everything else (B2C intrastate, or B2C interstate ≤ threshold) — aggregated by (place-of-supply, rate). |
| **CDNR**  | Credit notes whose recipient has a valid GSTIN. |
| **CDNUR** | Credit notes whose recipient has no GSTIN.  |
| **HSN**   | All outward supply lines, grouped by (HSN, rate, UQC). Credit notes are netted (negative). Lines without HSN raise a warning. |
| **DOCS**  | Document series — one row per (doc-type, alpha-prefix), with from/to numeric range, total, cancelled, net. |

### Trust signals built in

- **Per-section CSV downloads** match the GSTN offline-tool / Tally column order exactly.
- **Totals card** at the top of GSTR-1 reconciles taxable + IGST + CGST + SGST against the invoices for the period (credit notes subtracted).
- **Warnings panel** flags: missing HSN codes, malformed GSTINs (treated as B2C), and credit notes without an `original_invoice_no` reference.
- **GSTR-3B 6.1** = output liability − ITC from purchase invoices, so the user sees the net payable / refund position immediately.
- 19 e2e scenarios exercise every classification path, the threshold split, totals reconciliation, CSV header shape, and the orphan-credit-note warning.

### What's not covered in v1

Out-of-scope (not common for SMB, can be added later): `EXP` (exports), `AT` / `ATADJ` (advance tax), `NIL` rated supplies as a separate section, e-commerce operator (`ECOM`) flows, reverse-charge inward supplies (`3.1(d)`).

If you have specific filing scenarios that aren't covered, please open an issue with a redacted sample invoice.

## Database Schema & Migrations

SQLite file lives at `server/db/muneemji.sqlite` in dev, `/app/data/muneemji.sqlite` in Docker.

The schema is managed by a forward-only migration runner. Each migration is a numbered `.sql` file in `server/db/migrations/` (e.g. `001_initial.sql`). On every server boot the runner:

1. Applies any pending migrations inside a transaction
2. Records each one in `schema_migrations` with a SHA-256 checksum
3. **Refuses to start if an applied migration's file has been edited in place** — once a migration ships, never modify it. Add a new file (`002_*.sql`, `003_*.sql`…) instead.

Existing installs (pre-migration system) are auto-detected: the runner records `001_initial.sql` as applied without re-executing it, so no data is touched.

```bash
npm run db:status     # list applied + pending migrations
npm run db:migrate    # apply pending migrations
```

Tables: `users` (incl. TOTP columns), `settings`, `parties`, `products` (incl. `has_serial`, `warranty_months`), `stock_movements`, `invoices` (incl. `share_token`, and `original_invoice_id/no/date` for credit notes), `invoice_items`, `item_serials`, `payments`, `expenses`, `audit_log`, `recurring_invoices`, `bank_accounts`, `bank_statement_lines`, `reconciliation_matches`, `schema_migrations`.

To inspect the database directly:
```bash
sqlite3 server/db/muneemji.sqlite
sqlite> .tables
sqlite> SELECT no, party_name, total, status FROM invoices ORDER BY date DESC LIMIT 10;
```

## Configuration

### Backend
| Env var      | Default                         | Purpose                          |
| ------------ | ------------------------------- | -------------------------------- |
| `PORT`       | `3001`                          | API port                         |
| `DB_PATH`    | `server/db/muneemji.sqlite`     | SQLite file location             |

### Frontend
The frontend talks to the API via the Vite dev-server proxy (`/api` → `:3001`), so no extra config is needed in development. For production, build the client (`cd client && npm run build`) and serve `client/dist/` from any static host (Nginx, Caddy, Vercel, Netlify, etc.) — point its `/api` at the running Express backend.

## Production Deployment

Muneem Ji is designed to be self-hosted, with one container per shop. The shipped Dockerfile produces a single ~150 MB image that serves the React app and the API on the same port — no separate frontend host needed.

### Architecture

```
┌─────────────────────────────────────────┐
│           muneemji container            │
│  ┌────────────────────────────────────┐ │
│  │  Express on :3001                   │ │
│  │   ├─ /api/*     (JSON, requires    │ │
│  │   │             session cookie)    │ │
│  │   ├─ /uploads/* (auth-gated)       │ │
│  │   └─ /*         (React SPA)        │ │
│  └────────────────────────────────────┘ │
│  /app/data  ◀── volume ──▶  host disk   │
│   ├─ muneemji.sqlite  (your books)      │
│   ├─ uploads/         (receipts)        │
│   ├─ backups/         (daily snapshots) │
│   └─ .jwt-secret      (signing key)     │
└─────────────────────────────────────────┘
```

### Environment variables

Copy `.env.example` → `.env` and uncomment what you need.

| Var                       | Default                          | Purpose                                                          |
| ------------------------- | -------------------------------- | ---------------------------------------------------------------- |
| `MUNEEMJI_PORT`           | `3001`                           | Public port to expose                                            |
| `JWT_SECRET`              | auto-generated, persisted        | Pin a secret in production for stable sessions across rebuilds   |
| `CORS_ORIGIN`             | `http://localhost:5173,...`      | Comma-separated list of allowed origins (set to your domain)     |
| `BACKUP_HOUR`             | `2`                              | Local hour for nightly auto-backup                               |
| `BACKUP_RETENTION_DAYS`   | `7`                              | Days to keep auto-backups before pruning                         |
| `COOKIE_INSECURE`         | `0`                              | Set to `1` ONLY on plain HTTP — disables `Secure` cookie flag    |
| `DB_PATH`                 | `/app/data/muneemji.sqlite`      | SQLite file location                                             |
| `UPLOADS_DIR`             | `/app/data/uploads`              | Receipt uploads                                                  |
| `BACKUP_DIR`              | `/app/data/backups`              | Auto-backup destination                                          |

### Backups

- **Automatic**: a full JSON snapshot is written to `/app/data/backups/` every day at the configured hour. Files older than `BACKUP_RETENTION_DAYS` are pruned. A snapshot also runs once on container start if there is none for today.
- **On-demand**: from Settings → Data Management → "Run Backup Now", or `POST /api/backup/run-now` (admin only).
- **Manual export**: Settings → Data Management → "Export Backup (JSON)" downloads everything to your computer. Schedule one of these monthly to off-site storage (Google Drive, USB stick, S3).
- **Restore**: Settings → Data Management → "Import Backup" (admin only). User accounts are preserved; all business data is replaced.

### Going live

For a real shop counter on the LAN:
```bash
# On the shop server
git clone <your-fork>
cd muneemji
echo "JWT_SECRET=$(openssl rand -hex 64)" > .env
docker compose up -d
```

For a public domain (recommended for off-site / multi-counter setups), put it behind a reverse proxy that terminates TLS:
```nginx
server {
  listen 443 ssl http2;
  server_name billing.yourshop.com;
  ssl_certificate     /etc/letsencrypt/live/billing.yourshop.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/billing.yourshop.com/privkey.pem;
  location / {
    proxy_pass         http://127.0.0.1:3001;
    proxy_set_header   Host $host;
    proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
  }
}
```
Then set `CORS_ORIGIN=https://billing.yourshop.com` in `.env` and restart.

### Updating

```bash
cd muneemji
git pull
docker compose build
docker compose up -d
```

**Schema migrations** apply automatically the first time the new container boots — no separate step. The Express server holds off on accepting traffic until every pending migration succeeds. If a migration fails (e.g. checksum drift, SQL error), the container exits non-zero, the healthcheck fails, and your data stays untouched. Watch progress with:

```bash
docker compose logs -f muneemji | grep migrate
# expected on a clean upgrade:
#   [migrate] Applying 002_audit_log.sql…
#   [migrate] Applied  002_audit_log.sql
```

#### Inspecting migration state without restarting the app

```bash
# What's applied vs pending? (read-only, doesn't touch the DB):
docker compose --profile tools run --rm migrate-status
# or:  npm run docker:db:status

# Apply pending migrations explicitly (e.g., before bringing the server back up):
docker compose --profile tools run --rm migrate
# or:  npm run docker:migrate
```

Both commands share the same volume as the running container, so they see the live database.

#### Recovering from a failed migration

1. `docker compose logs muneemji` → find the SQL or checksum error
2. Restore the volume from your daily auto-backup (`/app/data/backups/`) if needed
3. Fix the problem (don't edit the migration file in place — see the warning above), `docker compose build`, `docker compose up -d`

### Resetting

```bash
docker compose down -v   # WARNING: deletes the volume (all data)
docker compose up -d     # fresh install — runs setup wizard again
```

## Authentication & Roles

| Role      | Can do                                                                       |
| --------- | ---------------------------------------------------------------------------- |
| `admin`   | Everything: invoices, parties, products, **users**, **backup restore**       |
| `cashier` | Day-to-day operations: POS, invoices, payments, expenses. No user mgmt.      |

- Sessions use a signed JWT in an `httpOnly`, `SameSite=Lax`, `Secure` cookie (TTL 7 days).
- Password hashing: bcrypt, 12 rounds.
- Rate limit: 10 login attempts per 15 minutes per IP.
- The first user created via the setup wizard is automatically an `admin`.
- Add more users (cashiers or admins) under **Settings → Security & Users**.

## Branding & Customization

Brand colors are defined in `client/tailwind.config.js`:

| Token         | Hex       | Use                                        |
| ------------- | --------- | ------------------------------------------ |
| `navy`        | `#1a2b5e` | Sidebar, headings, primary text            |
| `amber`       | `#f5a623` | CTAs, active nav, "Ji" wordmark, highlights |

To swap the logo, replace `client/public/logo.png` (square PNG, ~512×512 recommended). It's used in the sidebar, invoice header, PDF, browser favicon, and empty states.

## Roadmap

v1.0 ships full GST billing, POS, reports, authentication, multi-user, automated backups, Docker deployment, audit log + period lock, recurring invoices, 2FA (TOTP), bank reconciliation, public share links, WhatsApp PDF share via the Web Share API, and **GSTR-1 / GSTR-3B return generation** with Tally-compatible CSV export.

**Next up (community ideas welcome):**

- [ ] **POS barcode scanner** — USB HID scanner support, `barcode` column on products
- [ ] **e-Invoice / IRN integration** with the GSTN portal
- [ ] **Backup to Google Drive / S3** from the Settings panel
- [ ] **Hindi / regional-language UI** (i18n scaffolding first)
- [ ] **WhatsApp Business API** for payment reminders (vs. the current Web Share / `wa.me` link)
- [ ] **Multi-business / multi-tenant** SaaS mode
- [ ] **Mobile app** (React Native sharing the same API)
- [ ] **Cloud sync** (optional, encrypted, opt-in only)

## Contributing

Contributions are very welcome — Muneem Ji is built for the community.

1. Fork the repo and create a feature branch (`git checkout -b feat/my-thing`)
2. Make your change. Keep PRs focused and small.
3. Run the app end-to-end (`npm run dev`) and confirm nothing regresses
4. Open a PR with a clear description of the *why*

Some great first issues:
- POS barcode scanner support (USB HID, no native deps)
- New invoice themes (Classic / Modern / Minimal layouts)
- More report exports (Excel)
- i18n scaffolding (Hindi first)
- Screenshots for the README

## License

[MIT](LICENSE) © Muneem Ji contributors

> Free to use, modify, and distribute — even commercially. If Muneem Ji powers your shop, a star ⭐ on the repo means a lot.

## Acknowledgements

Built with respect for the original *muneems* who kept India's small businesses running for generations — long before any software existed. This is just their craft, with a screen.

---

<div align="center">

**Muneem Ji** · *Aapka Digital Muneem*

Made in India 🇮🇳 with ❤️

</div>
