# FAQ

Common questions and pitfalls. If something here is wrong or missing, [open an issue](https://github.com/JawedCIA/muneem-ji/issues).

---

## Setup & Install

### Port 3001 is already in use
Another service is bound to 3001. Either stop it, or override the port:
```bash
# Docker
docker compose up -d -p 3002:3001
# Local Node
PORT=3002 npm run dev
```

### "Cannot find module" or weird CRLF errors on Windows
Git on Windows can convert line endings. The repo includes `.gitattributes` to normalize text files to LF — re-clone after pulling latest, or run:
```bash
git rm --cached -r .
git checkout .
```

### How do I reset everything and start fresh?
**Docker:** `docker compose down -v` removes the volume.
**Local Node:** delete `server/data/db.sqlite` and `server/data/.jwt-secret`. The next start re-runs setup.

### The first-run wizard never appears
The wizard only shows when there are zero users. If you have an admin account, sign in normally. Forgot the password? See "Reset admin password" below.

---

## Authentication & Users

### I forgot my admin password
There's no email reset (self-hosted, no SMTP assumed). Open the SQLite DB directly:
```bash
sqlite3 server/data/db.sqlite
DELETE FROM users WHERE role = 'admin';
```
The next visit triggers the setup wizard — pick a new password.

### Can I have multiple shops on one install?
**No** — Muneem Ji is single-tenant by design. Each shop runs its own container/instance with its own `data/` directory. Multi-tenant complicates GST returns, audit log, and backups, so we keep it simple.

### What's the difference between admin and cashier roles?
| Capability                | Admin | Cashier |
| ------------------------- | :---: | :-----: |
| Issue invoices, take payments | ✅ | ✅      |
| Edit settings, users, locks | ✅  | ❌      |
| Delete invoices             | ✅  | ❌      |
| View audit log              | ✅  | ❌      |
| Backup / restore            | ✅  | ❌      |

---

## GST

### My turnover is below ₹40L — do I need GST?
No. Toggle **GST registered business** OFF in Settings → Business Profile. Invoice / POS / reports drop GST columns automatically. See [SHOP-TYPES.md](SHOP-TYPES.md) for which presets enable GST.

### "Invalid GSTIN format" — what's the rule?
Standard 15-character check: 2-digit state code, 5 alpha PAN start, 4 digit, 1 alpha, 1 alphanumeric, fixed `Z`, 1 alphanumeric. Example: `27AAPFU0939F1ZV`. The validator is in `server/utils/validators.js`.

### CGST/SGST vs IGST — when does it switch?
Automatically based on **party state code vs. business state code**. Same state → CGST + SGST; different state → IGST. You can override per invoice via the "Interstate" toggle.

### How do I file GSTR-1 with the CSVs?
The CSV column order matches the GSTN offline tool / Tally. Download per section (B2B / B2CL / B2CS / CDNR / CDNUR / HSN / DOCS) → import into the offline tool → upload the JSON to gst.gov.in. See [GST-RETURNS.md](GST-RETURNS.md) for the full mapping.

---

## Features & Data

### I marked a product as "Has serial numbers" but my old invoices don't ask for serials
Correct. Server validation only enforces serials on **new** invoices for products with `has_serial = 1`. Historical invoices stay untouched — re-edit one if you want to back-fill serials manually.

### Can I track both batch AND serial on the same product?
Technically yes (both flags can be on), but practically rare. A pharmacy-with-imported-equipment shop might use it. Most products are one or the other.

### I turned off a feature — is the data deleted?
**No.** Toggling `feature.batches` off just hides the sidebar item and the batch UI on invoice forms. All `invoice_items.batch_no` data stays in the DB. Flip the toggle back on and everything reappears.

### How do I share an invoice with a customer who isn't logged in?
Every invoice has a 32-character `share_token`. Click "Share on WhatsApp" → uses Web Share API to attach the PDF on mobile, or sends a `wa.me` link to the public read-only viewer at `/i/<token>`. Customers don't need accounts.

---

## Backups & Data

### Where is my data?
**Docker:** the named volume mounts at `/app/data`. Inspect with `docker volume inspect muneem-ji_data`.
**Local Node:** `server/data/`.

Inside, you'll find:
- `db.sqlite` — the entire database
- `backups/` — daily snapshots
- `uploads/` — receipt images and logos
- `.jwt-secret` — auto-generated, do not share

### How do I move my install to a new machine?
1. Stop the old container / process
2. Copy the entire `data/` directory to the new machine
3. Start the new container with the same volume
4. Migrations run on boot — your data picks up where it left off

### Can I open db.sqlite in a SQL tool?
Yes. SQLite is just a file. Use [DB Browser for SQLite](https://sqlitebrowser.org/) for read access. **Do not write to it while Muneem Ji is running** — use the API or stop the server first.

---

## Performance

### How many invoices / month before things slow down?
Tested smoothly to **~100k invoices** on a ₹3000 mini-PC. SQLite + better-sqlite3 is fast for single-shop workloads. If you're issuing >1000 invoices/day from one shop, you're probably outgrowing self-hosted territory anyway — open an issue, we can talk.

### Can I run on a Raspberry Pi?
Yes, Pi 4 (4GB+) is fine. Pi 3 will work but feel sluggish on the dashboard.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
