# Installation

Three install paths — pick the one that matches how you'll run Muneem Ji.

| Path                          | Best for                                               | Time   |
| ----------------------------- | ------------------------------------------------------ | ------ |
| **A. Docker (recommended)**   | Shop owners, mini-PCs, one-command deployments         | 5 min  |
| **B. Local Node (dev)**       | Anyone modifying code, fixing bugs, contributing       | 10 min |
| **C. Remote VPS**             | Multi-shop owner, accountant managing several clients  | 20 min |

> **Tip:** the README has a **30-second** quick-start at the top. This page exists for the slower walkthrough and the edge cases.

---

## A. Docker (recommended)

**Requirements:** Docker Desktop (Mac / Windows) or Docker Engine + Compose (Linux). 1 GB RAM. Any laptop / mini-PC from the last decade.

```bash
git clone https://github.com/JawedCIA/muneem-ji.git
cd muneem-ji
cp .env.example .env       # optional — defaults are fine for a single-shop install
docker compose up -d
```

Open <http://localhost:3001>. The first visit walks you through admin account + business profile + shop type.

**What just happened:**
- A single container built from `Dockerfile` runs the Express API and serves the React build
- A named volume mounts at `/app/data` and holds **db.sqlite + uploads + backups + .jwt-secret**
- Schema migrations apply automatically on boot — no separate step
- Daily backups land in `/app/data/backups` (configurable in Settings → Data Management)

**Updating to a new release:**
```bash
git pull
docker compose pull
docker compose up -d --build
```
Migrations are forward-only and apply automatically. If a migration fails, the container exits non-zero and your data stays untouched.

See [Production Deployment](../README.md#production-deployment) in the README for backup, healthcheck and reverse-proxy details.

---

## B. Local Node (development)

**Requirements:** Node 20+, npm 9+.

```bash
git clone https://github.com/JawedCIA/muneem-ji.git
cd muneem-ji
npm run install:all     # installs server + client deps
npm run seed            # optional — adds demo parties, products, invoices
npm run dev             # starts Express on :3001 and Vite on :5173
```

Open <http://localhost:5173>. Vite proxies `/api/*` to `:3001`.

**Useful scripts:**
| Script              | Purpose                                    |
| ------------------- | ------------------------------------------ |
| `npm run dev`       | API + client in watch mode                 |
| `npm run seed`      | Repopulate the demo dataset                |
| `npm run e2e`       | Run the e2e test suite (server-only)       |
| `npm run build`     | Produce a production client bundle         |
| `npm run lint`      | ESLint pass                                |

---

## C. Remote VPS (single shop, low-traffic)

A ₹500–800/month VPS (Hetzner / DigitalOcean / Linode) is more than enough.

1. Provision Ubuntu 22.04+, install Docker + Compose
2. Clone the repo, set a strong `JWT_SECRET` in `.env` (or let the auto-generated `/app/data/.jwt-secret` handle it)
3. Front the container with **Caddy** or **nginx** for HTTPS — see [README → Production Deployment](../README.md#production-deployment)
4. Schedule backups off-host (rsync `/app/data/backups` to S3 / Backblaze / a friend's NAS — ₹0 if you already have storage)

**Don't expose port 3001 directly to the internet.** Always go through HTTPS and a reverse proxy.

---

## Common issues

See [FAQ.md](FAQ.md) for things like CRLF on Windows, port conflicts, "GSTIN required" errors, and how to reset everything.
