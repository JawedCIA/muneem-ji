# Pre-launch checklist

Tick these off before posting on LinkedIn. None of them is huge —
the goal is that a curious stranger lands on the repo and "gets it"
in under 30 seconds.

## Repo polish (≈ 30 minutes)

- [ ] **Capture screenshots** per `docs/screenshots/README.md` (at least the 4 required shots)
- [ ] Add the hero shot to the top of the project README (the placeholder is in place)
- [ ] Add a `repo description` on GitHub: *"Self-hosted GST billing app for Indian small businesses — GSTR-1/3B, POS, WhatsApp share, serial tracking. MIT licensed."*
- [ ] Add `topics` to the GitHub repo: `gst`, `billing`, `india`, `pos`, `self-hosted`, `react`, `nodejs`, `sqlite`, `accounting`, `open-source`
- [ ] Set the repo's social preview image to the Dashboard screenshot (Settings → General → Social preview)
- [ ] Pin the repo on your GitHub profile

## GitHub ops (≈ 15 minutes)

- [ ] Enable **GitHub Discussions** (Settings → Features) — gives non-bug feedback a home
- [ ] Create a `v1.0.0` GitHub Release with the CHANGELOG entry as the body
- [ ] Triple-check `.gitignore` — `.env`, `.jwt-secret`, `*.sqlite` should never be in git history
- [ ] Verify the LICENSE file is at root and is MIT
- [ ] One-line tagline in `package.json` description matches the repo description

## Demo polish (≈ 1 hour, optional but high-value)

- [ ] Record a **60-second screen recording** (Loom / OBS / QuickTime):
  1. (0-10s) Open the dashboard, point out KPIs
  2. (10-25s) Create an invoice with 2 line items, save as draft
  3. (25-40s) Open POS, add 3 items, take payment
  4. (40-55s) Open Reports → GSTR-1 → click "Download B2B CSV"
  5. (55-60s) End on the GitHub repo URL
- [ ] Upload the video to YouTube as **unlisted** (LinkedIn supports YouTube embeds)
- [ ] Drop the YouTube link in the README under a new **Demo** section

## Landing page on mannatai.com (≈ 1 hour)

See `docs/launch/landing-page.md` for the copy + sections you can lift directly.

- [ ] Add a short Muneem Ji section (or dedicated page) on mannatai.com
- [ ] CTA buttons: "View on GitHub" + "Read the docs"
- [ ] Make sure the page is indexed (set canonical URL, add to sitemap)

## Right before posting (5 minutes)

- [ ] Open the LinkedIn post draft in `docs/launch/linkedin-post.md` — pick draft B (medium)
- [ ] Attach the Dashboard hero screenshot directly (not just the GitHub URL — uploaded images perform ~3x better)
- [ ] Schedule for **Tuesday or Wednesday, 8-10 am IST** if possible
- [ ] Set a phone reminder for **+4 hours** to reply to every comment
- [ ] Have the follow-up post idea ready (e.g. "How GSTR-1 export works under the hood") for +24-48h later

## After posting

- [ ] Reply to every comment in the first 4 hours
- [ ] Cross-post a tightened version on Twitter / X
- [ ] Submit to **Hacker News** (Show HN: Muneem Ji — self-hosted GST billing for Indian shops). HN audience is global so reframe the headline
- [ ] Submit to **r/india**, **r/IndiaBusiness**, **r/selfhosted**
- [ ] Post in 1-2 Indian developer Slack / Discord communities
