# Security Policy

Muneem Ji handles small-business financial data — invoices, customer GSTINs, payments, bank statements. We take security reports seriously.

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Email reports to: **security@mannatai.com**

Include:
- A description of the issue and its impact
- Steps to reproduce (or a proof-of-concept)
- The version / commit hash you tested against
- Any suggested fix, if you have one

You should expect an initial reply within **3 business days**. We will keep you informed as we work through triage and patching.

## Scope

In scope:
- The application code in this repository
- Default Docker deployment (`docker-compose.yml`)
- Authentication, session handling, 2FA, API authorization
- Public share-link endpoints (`/api/public/*`)
- File upload paths (logo, expense receipts, CSV bank statements)

Out of scope:
- Self-hosted deployments behind misconfigured reverse proxies / firewalls
- Vulnerabilities requiring physical access to the host machine
- Issues in upstream dependencies that are already publicly known and tracked
- Denial-of-service via unrealistic resource exhaustion (e.g. uploading a 10 GB file)
- Social engineering of legitimate users

## Disclosure

Once a fix has shipped, we'll publish a brief advisory in the [GitHub Security Advisories](https://github.com/JawedCIA/muneem-ji/security/advisories) section, crediting the reporter (unless they prefer to remain anonymous).

## Hardening checklist for self-hosters

When deploying to production:

- [ ] Set `JWT_SECRET` to a 64-character random hex value (don't rely on the auto-generated one)
- [ ] Run behind HTTPS — TLS-terminating reverse proxy (nginx/Caddy/Traefik)
- [ ] Set `CORS_ORIGIN` to your actual domain, not the default localhost list
- [ ] Do **not** set `COOKIE_INSECURE=1` in production
- [ ] Keep the `/app/data` volume on a backed-up disk; daily auto-backups already write there
- [ ] Restrict the host machine: firewall, OS updates, SSH keys not passwords
- [ ] Enable 2FA on the admin user from Settings → Security & Users
