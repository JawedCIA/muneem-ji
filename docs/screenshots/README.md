# Screenshots — capture guide

Take the shots in this order with the data described below.
The first 4 are required for the README hero strip and the LinkedIn post;
the rest are nice-to-have for the docs site / landing page.

**Setup before capturing:**
1. Run a clean instance: `npm run install:all && npm run seed && npm run dev`
2. Open Chrome at http://localhost:5173
3. Browser zoom: **90%** (cleaner Retina-quality export)
4. Window: **1440 × 900** (standard MacBook Air)
5. Use the seeded demo data — looks more believable than empty screens
6. **Hide the dev server bar** if Vite shows one (right-click → Inspect to dismiss)
7. Save as PNG, ~1600 px wide, into this folder

---

## Required shots (4)

### 01-dashboard.png — *the hero shot*
- Page: `/` (Dashboard)
- Make sure: 6-month sales chart visible, 4 KPI tiles populated, recent invoices list non-empty
- Crop: full page, sidebar included
- This is the image LinkedIn will preview — pick the version where the chart looks busy

### 02-pos.png
- Page: `/pos`
- Add 3-4 items to cart (mix categories), pick "Walk-in customer" or a real one, leave payment modal closed
- Shows: tablet-friendly counter UI, ₹ totals, payment-mode buttons

### 03-invoice-pdf.png
- Page: `/invoices/<any>` then click **Print Preview** (or open the PDF in a new tab and screenshot the rendered page)
- Pick an invoice with 4-6 line items, a real party, a GSTIN
- Shows: print-ready GST invoice with CGST/SGST, your business header

### 04-gstr1.png
- Page: `/reports` → **GSTR-1 Returns** tab
- Pick the most recent month that has data
- Shows: section tabs (B2B / B2CL / B2CS / CDNR / HSN / DOCS), totals card, **download CSV** button visible

---

## Nice-to-have shots (8)

### 05-serials.png
- Page: `/serials`
- Search for a partial serial → results visible with status badges
- Shows: warranty register working

### 06-invoice-form.png
- Page: `/invoices/new`
- A few line items, one of them serial-tracked (so the amber serials sub-row appears)
- Shows: invoice creation flow

### 07-public-share.png
- Open `/i/<token>` (use one from a real invoice's share button)
- Shows: customer-facing read-only view

### 08-whatsapp-share.png
- Click "Share on WhatsApp" on any invoice — capture the modal with the editable message + the **Send PDF** button
- Shows: Web Share API + WhatsApp integration

### 09-recurring.png
- Page: `/recurring`
- At least 2 templates set up (monthly + quarterly)
- Shows: subscription billing capability

### 10-banking.png
- Page: `/banking`
- After importing one HDFC/ICICI CSV — at least 5 statement lines visible
- Shows: bank reconciliation in action

### 11-setup-wizard.png
- Page: `/setup` (sign out first, then the wizard appears)
- Capture step 2 (Business Profile) with the **GST toggle visible**
- Shows: the new GST on/off feature

### 12-mobile.png
- Open Chrome DevTools → device toolbar → iPhone 14
- Page: Dashboard or Invoices list
- Shows: mobile responsiveness

---

## After capturing

Once the screenshots are in this folder, edit the project root `README.md`
and uncomment / replace the placeholder image references in the **Screenshots**
section with the real filenames.
