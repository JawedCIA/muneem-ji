# Contributing

Thank you for considering a contribution! Muneem Ji is built for Indian SMBs and benefits from anyone who's run, used, or repaired books for one. Code, docs, bug reports, edge cases — all welcome.

---

## Quick start (developer setup)

```bash
git clone https://github.com/JawedCIA/muneem-ji.git
cd muneem-ji
npm run install:all      # server + client
npm run seed             # demo data
npm run dev              # API + Vite client
```

See [docs/INSTALL.md](docs/INSTALL.md) for the longer walkthrough.

---

## Workflow

1. **Open an issue first** for non-trivial changes. Saves both of us an awkward "we've been thinking differently about this" moment after the PR.
2. **One concern per PR.** A bug fix, a new module, a refactor — one of those, not all three.
3. **Tests before "done."** Add at least one e2e scenario in `server/test/e2e.mjs` for any new endpoint or behavior change. Run `npm run e2e` until you see `[e2e] N/N passed`.
4. **Migrations are forward-only.** Never edit a migration that's already been merged — checksums are enforced on boot. Add a new `NNN_*.sql` instead.
5. **Branch off `main`.** PR back to `main`. We'll squash-merge.

---

## Coding conventions

### Server (Node + Express + better-sqlite3)
- ES modules (`import` / `export`), Node 20+
- Schema validation with **Zod** at every route boundary
- DB access via prepared statements; no string concatenation into SQL
- Pure functions where possible (e.g. `server/utils/gstr.js`, `server/utils/gstCalc.js`)
- Audit-log every create / update / delete on user-visible entities

### Client (React 18 + Vite + Tailwind)
- Functional components only; hooks for state
- Settings-driven UI — gate features by `useFeature('feature.xxx')`, GST by `useGstEnabled()`
- Tailwind for styling; reusable UI primitives in `client/src/components/ui/`
- `formatINR` for money, `formatDate` for dates — never `toLocaleString` directly

### General
- Prefer editing existing files over creating new ones
- Don't add comments explaining *what* the code does — let names do that. Add comments only when *why* is non-obvious (a hidden constraint, a workaround for a bug, a load-bearing invariant)
- No emojis in committed code, only in user-visible labels / docs where they aid scanning

---

## Migrations

Migrations live in `server/db/migrations/NNN_description.sql` and are applied in order on boot. The runner records each successful apply in `schema_migrations` with a checksum.

**Rules:**
- Never edit a migration after it's been merged — the checksum will drift and boot will fail
- Forward-only: if you need to fix a wrong migration, write a new one that corrects it
- Use `INSERT OR IGNORE` for seeding settings so re-applies are idempotent
- Use `ALTER TABLE ADD COLUMN` for schema additions; SQLite doesn't support DROP COLUMN cleanly

See `architecture_migrations.md` notes in the codebase for more detail.

---

## Tests

The e2e suite at `server/test/e2e.mjs` is the source of truth for "does this still work?" It boots a real Express server against a temp SQLite DB and exercises every public endpoint.

```bash
npm run e2e
```

Add scenarios:
- One per new endpoint (happy path)
- One per validation rule (rejects bad input)
- One per cross-feature interaction (e.g. "deleting an invoice cascades serials")

The pattern is `await step('description', async () => { ... })` — copy any existing block.

---

## Commits & PRs

- Use **conventional-commit** prefixes: `feat(scope):`, `fix(scope):`, `docs:`, `refactor:`, `test:`, etc.
- Keep messages factual — what changed and why. The repo doesn't accept `Co-Authored-By` trailers from automated tools.
- Don't force-push after a review has started. Reviewers lose context.

---

## Reporting bugs

Use the [GitHub issues page](https://github.com/JawedCIA/muneem-ji/issues). Helpful info to include:
- What you were doing
- What happened (paste any error from the browser console or container logs)
- What you expected
- Your environment: Docker / local Node, OS, browser
- For data issues: a minimal repro (don't share real customer data — synthesize)

---

## Security issues

Please **don't open a public issue** for security-relevant bugs. See [SECURITY.md](SECURITY.md) for the disclosure path.

---

## Scope boundaries

We're deliberately *not* trying to be:
- A multi-tenant SaaS
- A full-fledged ERP (manufacturing, multi-warehouse, MRP)
- A global tax engine — Indian GST is the only tax model

Stay close to the "Indian SMB shop" mental model and most ideas will land cleanly.

Thanks again for reading this far.
