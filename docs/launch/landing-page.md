# mannatai.com — Muneem Ji section copy

Drop-in copy for a section (or dedicated page) on mannatai.com.
Plain-language so it can be tweaked for marketing tone without hunting through code.

---

## Hero section

**Headline:**
> Muneem Ji — Aapka Digital Muneem

**Sub-headline:**
> Self-hosted GST billing for Indian shops.
> No subscription. No vendor lock-in. Your data on your laptop.

**Primary CTA:** [⭐ View on GitHub](https://github.com/JawedCIA/muneem-ji)
**Secondary CTA:** [Read the docs](https://github.com/JawedCIA/muneem-ji#readme)

**Hero image:** the Dashboard screenshot (`docs/screenshots/01-dashboard.png`)

---

## "Why" section

A few months back, the founder visited his cousin's electronics shop in a Bihar town — washing machines, ACs, fans, the works. The day was a beautiful chaos: customers walking in, a notebook with running balances, a worn-out calculator, WhatsApp orders buzzing non-stop.

When asked why he didn't use any of the popular billing apps, his cousin's answer stuck:

> *"Internet jaaye toh dukaan band. Subscription har saal badhta hai. Aur sabse badi baat — meri customer list, meri sales — sab unke server pe. Mera apna data mere paas hi nahi."*

That conversation became Muneem Ji.

---

## "What you get" — 6 cards

### 🧾 Full GST invoicing
Automatic CGST/SGST/IGST split based on party state vs. business state. GSTIN validation. Tax invoice / bill of supply. Quotations with one-click conversion.

### 📊 GSTR-1 + GSTR-3B export
Per-section CSVs that drop straight into the GSTN offline tool or Tally — B2B, B2CL, B2CS, CDNR, CDNUR, HSN summary, Documents Issued. GSTR-3B summary card you can read off and type into the portal.

### 🛒 Tablet POS
Counter-friendly point of sale with thermal 80mm receipts, custom items, multi-payment mode (Cash / UPI / Card / Cheque), walk-in or registered customer, WhatsApp share.

### 📱 Serial + warranty tracking
For electronics / mobile / jewellery / appliance shops. Capture serial / IMEI per unit at billing, warranty period rolls forward automatically, search any serial across the lifetime of your shop.

### 💬 WhatsApp share
One-click send: link or PDF (Web Share API attaches the PDF natively to WhatsApp on mobile). Editable message template per shop. Public share link viewer at `/i/:token` — no login required for the customer.

### 🔐 Production-ready
Multi-user (admin / cashier), 2FA (TOTP), audit log of every change, period lock, daily auto-backups, single Docker container, runs on a ₹3000 mini-PC.

---

## "Built for" mini-strip

> Built for **kirana stores · electronics & appliance shops · mobile shops · service businesses · wholesalers · small clinics · jewellers · stationery shops** — and any Indian SMB that wants their books on their own disk.

---

## "Not a SaaS" callout block

| Other billing apps | Muneem Ji |
| --- | --- |
| ₹500–₹3000/month, forever | ₹0/month |
| Your data on their server | Your data on your disk |
| Locked into their export format | Open SQLite + JSON backups |
| Internet down → shop down | Runs offline, full speed |
| Closed-source | MIT open source |

---

## Final CTA section

**Headline:** Try it in 30 seconds

```bash
git clone https://github.com/JawedCIA/muneem-ji.git
cd muneem-ji
docker compose up -d
# Open http://localhost:3001 — done.
```

**Buttons:**
- [⭐ Star on GitHub](https://github.com/JawedCIA/muneem-ji)
- [📖 Full docs](https://github.com/JawedCIA/muneem-ji#readme)
- [🐛 Report an issue](https://github.com/JawedCIA/muneem-ji/issues)

---

## Footer / About line

> Muneem Ji is built and maintained by **mannatai.com**.
> MIT licensed. Free to use, modify, and distribute — even commercially.
> Made in India 🇮🇳 with respect for the original muneems who kept India's small businesses running for generations.
