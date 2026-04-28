# Changelog

All notable changes to Muneem Ji are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- **GSTR-1 returns** — full B2B, B2CL (with configurable ₹1L threshold), B2CS, CDNR, CDNUR, HSN summary, and Documents-Issued sections. Per-section CSV download matching the GSTN offline-tool / Tally column order. Top-of-page totals card reconciles to the underlying invoices (credit notes netted). Warnings panel flags missing HSN, malformed GSTINs, and credit notes missing the `original_invoice_no` reference.
- **GSTR-3B summary** — read-only summary of 3.1(a) outward taxable, 3.1(c) nil/exempt, 3.2 interstate B2C by place-of-supply, 4(A)(5) ITC from purchases, and 6.1 net tax payable.
- `migrations/008_gst_returns.sql` — adds `original_invoice_id / original_invoice_no / original_invoice_date` columns on `invoices` (used by credit notes for CDNR/CDNUR) and seeds the `b2clThreshold` setting (default `100000`).
- 19 new e2e scenarios covering classification, threshold split, totals reconciliation, CSV header shape, validation, and the orphan-credit-note warning. Test suite is now **137 / 137**.
- `.gitattributes` — normalize all text files to LF in the repo, mark binaries explicitly. Keeps Windows checkouts clean.

### Changed
- Reports page — old "GSTR-1 Format" tab (rate-summary stub) replaced by the real GSTR-1 returns view with section tabs, counts, totals, warnings, and per-section CSV downloads. New "GSTR-3B Summary" tab added alongside.
- README — replaced `<your-username>/muneemji.git` placeholders with the real `JawedCIA/muneem-ji` repo URL.
- README — refreshed Features list to surface public share links, audit log, period lock, 2FA, recurring invoices, bank reconciliation, and Web Share API PDF attach (previously hidden under a single "WhatsApp share — wa.me link" line).
- README — expanded API reference with the Public, TOTP, Recurring, Bank, and Audit endpoint tables; added the `/api/invoices/:id/share` row.
- README — schema table list now includes `audit_log`, `recurring_invoices`, `bank_accounts`, `bank_statement_lines`, `reconciliation_matches`, and the TOTP columns on `users`.
- README — Project Structure refreshed (real route names, migrations folder, e2e file, Docker + .env.example, .github/).
- README — Roadmap updated: items shipped in v1.0 (recurring, audit, 2FA, bank rec) removed; GSTR-1/3B export and POS barcode scanner promoted to "next up".

## [1.0.0] — 2026-04-26

First public open-source release. Combines Phase 1 production hardening and Phase 2 feature work into one shippable foundation.

### Added — Core
- GST-compliant sale, purchase, and quotation invoices with automatic CGST/SGST/IGST split
- Quotations with one-click "Convert to Invoice"
- Parties (customers / suppliers) with all 29 Indian states + UTs and GSTIN validation
- Products & inventory with auto-deducting stock on sales
- Expenses with category, vendor, payment mode, and receipt upload
- Tablet-friendly POS with thermal-style 80mm receipts and on-the-fly custom items
- Payments with partial/full reconciliation and overdue auto-flagging
- Reports: Dashboard KPIs, Sales Register, GST Summary, Profit & Loss, Party Ledger, Expense report — all exportable to CSV

### Added — Production hardening (Phase 1)
- JWT auth in httpOnly cookie, bcrypt password hashing, two roles (admin / cashier)
- First-run setup wizard creates the admin and shop profile
- Forward-only schema migrations (`server/db/migrations/NNN_*.sql`) with SHA-256 checksum drift detection on boot
- Daily auto-backup scheduler with retention
- Centralised audit log (`server/utils/audit.js`) with auto-redaction of password / token fields
- Period lock — prevents edits to dates inside a closed accounting period (HTTP 423)
- Cursor-style pagination contract: `{ rows, total, page, pageSize }` (or flat array with `?all=1`)
- Single Docker image serves API + React; `/app/data` volume persists DB, uploads, backups, JWT secret
- 110+ end-to-end smoke tests in `server/test/e2e.mjs`

### Added — Phase 2 features
- **Recurring invoices** — weekly / monthly / quarterly / yearly templates, hourly scheduler, manual run + pause/resume
- **Two-factor authentication** — RFC 6238 TOTP (no external dep, ~60 lines), QR enrolment, backup codes, two-stage login
- **Bank reconciliation** — CSV import with auto column-detection (HDFC / ICICI / SBI variants), match against payments or expenses, ±0.01 / ±7-day suggestions
- **WhatsApp share** — public share-link viewer (`/i/:token`, `/q/:token`) with 128-bit token, editable message template in Settings, rate-limited unauthenticated public API
- **PDF + Web Share** — client-side PDF generation; on mobile (Android Chrome / iOS 15.4+) the OS share sheet attaches the PDF to WhatsApp natively; falls back to link share on desktop
- Mobile / tablet polish — drawer sidebar, touch-friendly action buttons, `(hover: hover)` media-query gating

### Added — Open-source baseline
- MIT LICENSE, README with founding story, CONTRIBUTING, SECURITY, this CHANGELOG
- `.env.example`, GitHub issue / PR templates
- Built and maintained by [mannatai.com](https://mannatai.com)
