# LinkedIn launch post — drafts

Three lengths so you can pick based on how the timing / image lands.
LinkedIn personal post hard limit is **3000 characters**.
First **210 characters** are visible before the "see more" fold — make those count.

---

## Draft A — short (≈ 700 chars, punchy)

A few months back I visited my cousin's small shop in Bihar.

Customers in for everything from a soap bar to a month's groceries on credit. A worn-out calculator. WhatsApp orders buzzing non-stop.

I asked why he doesn't use the popular billing apps. His answer:

> "Internet jaaye toh dukaan band. Subscription har saal badhta hai. Aur meri customer list — sab unke server pe."

So I built **Muneem Ji** — a self-hosted GST billing app for Indian SMBs.

→ Runs on his laptop, works offline
→ ₹0 / month, no vendor lock-in
→ GSTR-1 / GSTR-3B export, POS, WhatsApp share, serial / IMEI tracking
→ Open source, MIT licensed

His data lives on his disk. Forever.

⭐ github.com/JawedCIA/muneem-ji
🔧 Built by mannatai.com

---

## Draft B — medium (≈ 1400 chars, story-led — recommended)

A few months back I visited my cousin's small electronics shop in Bihar — washing machines, fans, ACs, the works. The day was beautiful chaos: customers walking in, a notebook with running balances, a worn-out calculator, WhatsApp orders buzzing non-stop.

I asked him why he doesn't use any of the popular billing apps. His answer stuck with me:

> "Bhaiya, sab cloud pe hai. Internet jaaye toh dukaan band. Subscription bhi har saal badhta jaata hai. Aur sabse badi baat — meri customer list, meri sales — sab unke server pe. Mera apna data mere paas hi nahi."

That conversation became **Muneem Ji** — a self-hosted GST billing & business management app, built specifically for the way Indian small businesses actually run their books.

What it does:
✅ Full GST invoicing with automatic CGST/SGST/IGST
✅ One-click GSTR-1 / GSTR-3B export (Tally-compatible CSV)
✅ Tablet-friendly POS with thermal-style 80mm receipts
✅ Serial / IMEI tracking with warranty register (for electronics, mobile, jewellery)
✅ WhatsApp share — invoices sent as PDF or link
✅ GST optional toggle (turn it off if you're below threshold)
✅ Recurring invoices, bank reconciliation, audit log, 2FA

What it costs:
₹0 / month. No subscription. No vendor lock-in. Your data on your laptop.

It's open source (MIT) — fork it, ship it to the shop next door, send a PR.

⭐ github.com/JawedCIA/muneem-ji
🔧 Built and maintained by mannatai.com

If you know a shop owner — or a developer building for one — I'd love your feedback.

#OpenSource #SMB #GST #IndianStartups #Billing #SelfHosted

---

## Draft C — long (≈ 2400 chars, "build in public" tone)

A few months back I visited my cousin's small electronics shop in a Bihar town — washing machines stacked next to refrigerators, an AC running on test mode, fans hanging from the ceiling. The day was a beautiful chaos: customers walking in for everything from a single tubelight to a 1.5-ton split AC on EMI, a notebook with running balances scribbled in the margins, a worn-out calculator with smudged keys, a phone constantly buzzing with WhatsApp orders.

I asked him why he didn't use any of the popular billing apps. His answer stuck with me:

> "Bhaiya, sab cloud pe hai. Internet jaaye toh dukaan band. Subscription bhi har saal badhta jaata hai. Aur unke menu English mein hai, mere staff ko samajh nahi aata. Aur sabse badi baat — meri customer list, meri sales — sab unke server pe. Mera apna data mere paas hi nahi."

That conversation became **Muneem Ji** — *Aapka Digital Muneem*.

A self-hosted GST billing & business management app, built for the way Indian SMBs actually run. Not a SaaS. Not a freemium-with-feature-gates trap. A single Docker container that runs on his shop laptop, on a ₹3000 mini-PC, on whatever hardware he already has.

What's in v1:
🧾 Full GST invoicing — automatic CGST/SGST/IGST split by party state
📊 GSTR-1 / GSTR-3B return generation with Tally-compatible CSV export
🛒 Tablet-friendly POS with thermal-style 80mm receipts
📱 Serial / IMEI tracking with warranty register (active / expiring / expired)
💬 WhatsApp share — PDF attachment via Web Share API on mobile
🔁 Recurring invoices (weekly / monthly / quarterly)
🏦 Bank reconciliation with HDFC / ICICI / SBI CSV auto-detection
🔐 Multi-user, audit log, period lock, 2FA (TOTP), daily auto-backups
🌍 GST toggle — turn it off entirely if your turnover is below threshold

What it costs:
₹0 / month. No vendor lock-in. Your books, your disk.

Open source under MIT — fork it, run it for your shop, ship it to the shop next door, or open a PR to fix what bothers you.

If you build for Indian SMBs, run a shop yourself, or know someone who does — I'd genuinely love your feedback. Especially the rough edges.

⭐ github.com/JawedCIA/muneem-ji
🔧 Built and maintained by mannatai.com

#OpenSource #SMB #GST #IndianStartups #Billing #SelfHosted #BuiltInIndia

---

## Notes for posting

- **Best image:** the Dashboard hero shot (`docs/screenshots/01-dashboard.png`). LinkedIn auto-previews the OG image when you paste a GitHub URL — but uploading the screenshot directly performs ~3x better.
- **Best time:** Tuesday or Wednesday, 8–10 am IST (when Indian SMB / dev / startup folks are scrolling LinkedIn over chai).
- **Don't:** start with "I'm excited / thrilled to announce…" — kills reach.
- **Do:** start with the story (cousin's shop). Hook is the first 210 chars.
- **Tag people**: anyone in the Indian developer / SMB-tech / OSS scene who'd care. 3-5 max — over-tagging gets demoted by the algorithm.
- **Reply** to every comment in the first 4 hours — algorithm boost.
- **Post a follow-up** 24-48h later with one specific feature deep-dive (e.g. "How GSTR-1 export works under the hood").
