# GST Returns — GSTR-1 / GSTR-3B

How Muneem Ji generates the returns that go into the GSTN portal.

> **Disclaimer:** Muneem Ji generates the data — **you are still responsible for filing**. Treat every output as a draft until your CA / consultant has reviewed it. GST rules also change; the `b2clThreshold` setting is parameterized so you can adjust without a code change.

---

## What gets generated

A pure-function generator at `server/utils/gstr.js` produces:

| Section   | Content                                                                             |
| --------- | ----------------------------------------------------------------------------------- |
| **B2B**   | Sales to a registered (GSTIN-bearing) party                                         |
| **B2CL**  | Interstate sales > ₹1,00,000 to unregistered parties (configurable threshold)       |
| **B2CS**  | All other unregistered sales — collapsed by place-of-supply + tax rate              |
| **CDNR**  | Credit/debit notes against B2B invoices, with the original invoice reference        |
| **CDNUR** | Credit/debit notes against B2CL invoices                                            |
| **HSN**   | Quantity / value summary by HSN code, **net of credit notes**                       |
| **DOCS**  | Documents Issued — invoice / debit-note / credit-note ranges with cancelled count   |

---

## How an invoice gets classified

A sale invoice is routed by:
1. Does the party have a GSTIN? → **B2B / CDNR**
2. Is the party state different from the business state, AND total > ₹1L? → **B2CL / CDNUR**
3. Otherwise → **B2CS**

```text
                ┌──────────────────────┐
                │  Invoice (sale or   │
                │   credit_note)      │
                └──────────┬──────────┘
                           │
              party.gstin ?│
                  ┌────────┴────────┐
                 YES               NO
                  │                 │
              ┌───▼──┐    interstate AND total > ₹1L ?
              │ B2B  │     ┌───────┴───────┐
              │/CDNR │    YES             NO
              └──────┘     │               │
                         ┌─▼──┐         ┌──▼──┐
                         │B2CL│         │B2CS │
                         │CDNUR│         └─────┘
                         └────┘
```

**Threshold drift:** The ₹1,00,000 cutoff is stored as `settings.b2clThreshold`. Change it via API or DB — no code change.

---

## CSV export

Each section downloads as a CSV with **column order matching the GSTN offline tool / Tally**:

```bash
GET /api/reports/gstr1/csv?period=2025-04&section=b2b
GET /api/reports/gstr1/csv?period=2025-04&section=b2cl
GET /api/reports/gstr1/csv?period=2025-04&section=b2cs
GET /api/reports/gstr1/csv?period=2025-04&section=cdnr
GET /api/reports/gstr1/csv?period=2025-04&section=cdnur
GET /api/reports/gstr1/csv?period=2025-04&section=hsn
GET /api/reports/gstr1/csv?period=2025-04&section=docs
```

The headers are defined in `SECTION_HEADERS` in `server/utils/gstr.js`. **Don't reorder them** — the offline tool matches by position, not header name.

### Filing flow
1. Go to **Reports → GSTR-1 Returns** → pick the month
2. Verify the per-section counts match your books
3. Click "Download CSV" for each section that has data
4. Open the GSTN offline tool, import the CSVs (or your Tally workflow if you use one)
5. Generate the JSON and upload to gst.gov.in

---

## GSTR-3B summary

`GET /api/reports/gstr3b?period=YYYY-MM` returns a read-only summary:

| Section       | Source                                                |
| ------------- | ----------------------------------------------------- |
| **3.1(a)**    | Outward taxable supplies (B2B + B2CL + B2CS netted) |
| **3.1(c)**    | Nil-rated / exempt outward                            |
| **3.2**       | Interstate supplies to unregistered, by place-of-supply |
| **4(A)(5)**   | ITC from purchase invoices                            |
| **6.1**       | Net tax payable (3.1 − 4(A))                          |

You read the numbers off this summary card and type them into the portal — the GSTN doesn't accept GSTR-3B uploads, so there's nothing to import.

---

## Trust signals

The Reports page warns when something is fishy:
- **Missing HSN** on any invoice item → flagged in the warnings panel
- **Malformed GSTIN** on the party → flagged
- **Credit note without `original_invoice_no`** → flagged (CDNR/CDNUR rejects without it)
- **Totals reconciliation** — the per-section sum on screen should match `subtotal + tax_total` of underlying invoices, with credit notes netted

If a warning appears, don't file. Fix it first.

---

## What's not covered

v1 ships with the high-frequency sections. Out of scope:
- **Imports / SEZ supplies** — small fraction of small-shop activity, deliberately deferred
- **Refunds, advance receipts** — same reasoning
- **Composition scheme (GSTR-4 / CMP-08)** — separate workflow, future
- **Reverse charge** flagging (the data model supports it via tax fields, but the UI doesn't surface it yet)

If your business needs any of these, [open an issue](https://github.com/JawedCIA/muneem-ji/issues) — happy to prioritize.
