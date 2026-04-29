# Security policy

Muneem Ji is self-hosted, but it still handles real money, real customer data, and real GSTINs. We take security reports seriously.

---

## Reporting a vulnerability

**Please do not open a public GitHub issue for security bugs.**

Email the maintainer at **jawed.cia@gmail.com** with:
- A description of the issue
- Steps to reproduce
- The version / commit you tested against
- Optional: a suggested fix

You'll get an acknowledgement within **48 hours**. We'll work on a fix, coordinate disclosure timing with you, and credit you in the release notes (unless you'd rather stay anonymous).

---

## In scope

- The Express API (`/api/*`)
- The React client and any client-side handling of session tokens, CSRF, etc.
- The SQLite layer and any SQL injection vectors
- The Docker image and entrypoint
- Authentication: cookies, JWT, password hashing, TOTP
- The public share-link viewer (`/i/<token>`)
- Backup & restore flows (escape, traversal, signing)

---

## Out of scope

These are explicitly **not** vulnerabilities:
- Issues only reproducible against a heavily modified fork
- Self-XSS that requires the victim to paste attacker-supplied JS into their own console
- DoS via single-host resource exhaustion when the operator has not set OS-level limits
- Exposure of `data/db.sqlite` if the operator has misconfigured the volume mount
- Information disclosure via `git log` / `git blame` in a public fork (use clean forks for sensitive deployments)
- Anything in a third-party dependency that has its own published advisory — please report directly upstream

---

## Hardening tips for operators

If you're running Muneem Ji in production:

1. **Always front it with HTTPS** — Caddy or nginx with auto-cert is fine
2. **Set a strong `JWT_SECRET`** in `.env`, OR rely on the auto-generated `/app/data/.jwt-secret` (don't commit either)
3. **Enable 2FA** for the admin account — Settings → Security → Two-Factor Authentication
4. **Set a period lock** after each filing — Settings → Period Lock — prevents accidental edits to filed periods
5. **Back up off-host** — daily backups to `/app/data/backups` aren't enough if the host disk fails. Replicate to S3 / Backblaze / a NAS
6. **Restrict the data volume's permissions** to the container UID; don't make `data/` world-readable
7. **Keep up with releases** — migrations are forward-only and safe to apply

---

## What this project does for you

- **bcrypt** for password hashing (cost factor 12)
- **httpOnly + SameSite=lax** cookies for the session JWT
- **CSRF protection** on every mutating route
- **Zod validation** at every API boundary — no untyped body data ever reaches the DB layer
- **Prepared statements only** for SQL — no string-concat queries
- **Audit log** of every create / update / delete on user-visible entities — tamper-evident in practice
- **Rate-limited** auth and public share-link routes
- **Rotation-ready** JWT secret (delete `/app/data/.jwt-secret`, restart, all sessions invalidate)

---

## Past advisories

None yet — please be the first to find something interesting.
