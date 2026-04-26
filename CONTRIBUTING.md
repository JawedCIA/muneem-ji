# Contributing to Muneem Ji

Thanks for your interest! Muneem Ji is built for the way Indian small businesses actually work, and contributions that keep that focus are very welcome.

## Quick start (development)

```bash
git clone https://github.com/JawedCIA/muneem-ji.git
cd muneem-ji

# Install everything (root + server + client workspaces)
npm install
npm install --prefix server
npm install --prefix client

# Run server (API on :3001) and client (Vite on :5173) in two terminals
npm run dev --prefix server
npm run dev --prefix client
```

Open `http://localhost:5173`. The first-run wizard creates your admin user and shop profile.

## Tech stack

- **Backend:** Node 18+, Express 4, better-sqlite3, Zod, JWT (httpOnly cookie)
- **Frontend:** React 18, Vite, Tailwind CSS, Zustand, Lucide icons, @react-pdf/renderer
- **Storage:** SQLite (WAL mode) — single file, runs anywhere

## House rules

### Migrations are forward-only

Every schema change is a new file in `server/db/migrations/NNN_name.sql`. The runner applies them on boot in order and refuses to start if a previously-applied file has been edited (checksum drift).

**Never edit an applied migration.** Add a new one.

### Always run e2e before opening a PR

```bash
node server/test/e2e.mjs
```

This boots a throwaway server on port 3199 with a clean DB and exercises every endpoint. It must end with `[e2e] N/N passed`. If you add a feature, add scenarios.

### Audit log + period lock

Every mutating route should write to the audit log via `server/utils/audit.js` and respect `assertNotLocked(date, action)` from `server/utils/periodLock.js` for date-bearing entities. The patterns are consistent across `routes/invoices.js`, `payments.js`, `expenses.js` — copy from there.

### Pagination contract

List endpoints return `{ rows, total, page, pageSize }` by default, and a flat array when `?all=1` is passed (used by pickers in POS, InvoiceForm, etc.). Use the helpers in `server/utils/pagination.js`.

### Indian-first, but inclusive

The product is designed around Indian SMB workflows (GST, ₹ formatting, state-wise tax, Hinglish microcopy). PRs that improve that fidelity are most welcome. PRs that add multi-country / multi-currency are welcome too, as long as they don't water down the Indian defaults.

## Code style

- ESM modules everywhere (`"type": "module"`)
- 2-space indent, single quotes, trailing commas
- No comment for obvious things — comments explain *why*, not *what*
- Don't add abstractions for hypothetical future requirements

## Reporting bugs / requesting features

Open an issue using the templates under `.github/ISSUE_TEMPLATE/`. For bugs, please include the steps to reproduce, what you expected, and what actually happened. Logs from the browser console + server stdout are gold.

## Security issues

Please do **not** open a public issue for security vulnerabilities. See [SECURITY.md](SECURITY.md).

## License

By contributing you agree your contributions will be licensed under the MIT License (same as the project).
