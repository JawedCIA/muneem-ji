# Manual browser checks before onboarding a real shop

The automated e2e (`npm run test:e2e`) covers every API code path the UI calls (66 scenarios). What it CAN'T verify is anything that needs an actual browser: layout, print quality, PDF rendering, drag-and-drop, mobile breakpoints, browser-specific behaviours.

Walk through this list once with `npm run dev` and the demo data loaded (Settings → Data → Load Demo Data), then once on a real Android tablet via `--host 0.0.0.0` for the POS-on-counter scenario.

## Auth flow
- [ ] Fresh DB → setup wizard appears at `/setup`, all 4 steps work, lands on Dashboard
- [ ] Logout (header avatar menu) → redirected to `/login`
- [ ] Wrong password shows red error, doesn't crash
- [ ] After logging in, all data is still there
- [ ] Password change in Settings → Security works, old password no longer accepted
- [ ] Cashier login (create one in Settings → Security) cannot see "Demo Data" or "Users" sections

## Logo + business details
- [ ] Settings → Business Profile: upload PNG → preview updates instantly
- [ ] Upload SVG / WebP / JPEG — all four formats accepted
- [ ] Try uploading a 5MB image → friendly error, no crash
- [ ] Try uploading a `.txt` → friendly error
- [ ] Logo appears on:
  - [ ] Sidebar (App.jsx) — currently still uses /logo.png; **VERIFY** if you want it to use the uploaded one
  - [ ] Invoice preview screen
  - [ ] PDF (Download invoice as PDF)
  - [ ] POS receipt modal
  - [ ] Printed POS receipt (only if uploaded)
- [ ] Remove logo → preview reverts to initials placeholder

## Invoices & free-text party
- [ ] Create new invoice, type a name like "Random Walk-in" — green "Will be saved as walk-in" hint appears
- [ ] Pick an existing party from the dropdown — "Linked to saved party" hint appears, interstate auto-detects
- [ ] Save → invoice list shows the typed name
- [ ] Edit existing invoice → party picker shows current name
- [ ] Print button → only invoice prints (no sidebar/header), A4 layout
- [ ] Download PDF → opens with logo, all business details, fixed footer on every page
- [ ] Convert quotation to invoice from Quotations page

## POS
- [ ] Search a product, click → adds to cart with qty 1
- [ ] Click same product again → qty increments to 2
- [ ] Click pencil icon → price + tax editor expands inline
- [ ] Edit price → grand total updates
- [ ] "Custom Item" button → modal opens, add e.g. "Plastic bag ₹5" → appears with "CUSTOM" pill in cart
- [ ] Customer picker: type "Rahul" → save → check that receipt shows "Rahul" not "Walk-in"
- [ ] Pick saved customer in different state → "interstate IGST" applied automatically
- [ ] Collect Payment → 6 payment modes, click Cash → sale completes, receipt modal opens
- [ ] **Print Receipt → ONE 80mm-wide page only, no blank A4 pages** (this was the bug)
- [ ] Receipt shows: logo (if uploaded), business name, full address, phone, email, website, GSTIN, customer name
- [ ] Try printing again from the modal → still works, no leaked print-mode CSS

## Settings → Demo data
- [ ] Empty DB → Dashboard shows amber banner "First time using Muneem Ji?"
- [ ] Click "Load Demo Data" → reloads with 5 parties / 10 products / 17 invoices
- [ ] Settings → Data Management → Run Backup Now → file appears in list
- [ ] Download backup → JSON file downloads
- [ ] Import Backup with that JSON → confirms, all data restored correctly
- [ ] Clear All Business Data → empty Dashboard, banner reappears, business profile preserved

## Reports
- [ ] Each of the 6 reports renders without errors with date filter
- [ ] CSV export downloads on every report
- [ ] Party Ledger picker shows all customers, picks one, ledger appears

## Delete protection (NEW)
- [ ] Try to delete a party that has invoices → toast shows "Cannot delete: party has N invoice(s)…"
- [ ] Try to delete a product that has been sold → toast shows the friendly 409 message
- [ ] Delete a brand-new party / product (no history) → succeeds

## Mobile / tablet (NEW — Sprint A polish)
Open Chrome DevTools, toggle device toolbar (Ctrl/Cmd+Shift+M), test at:

### iPhone SE (375×667)
- [ ] Sidebar: hidden by default. Hamburger icon (☰) in top-left of header opens it as a drawer
- [ ] Drawer: dark backdrop appears, tap backdrop OR the X to close
- [ ] Tap any nav item → drawer auto-closes, navigation works
- [ ] Page header: title + actions stack vertically, nothing clips
- [ ] Tables: horizontally scrollable, action buttons (✏️ 🗑️) **always visible** (no hover required)
- [ ] Modals: open full-screen, close button reachable, scrolls if tall
- [ ] SlideOver (e.g. New Invoice): full-width, scrollable, sticky bottom action bar
- [ ] Filter bars: stack to one column, no overflow
- [ ] POS: search + Custom Item button stack vertically, product grid is 2-column

### iPad Mini (768×1024 portrait)
- [ ] Sidebar: still hidden, hamburger drawer (md breakpoint kicks in at 768px so it just barely flips)
- [ ] POS: products take full width, cart panel BELOW (not side-by-side); both panels scroll independently
- [ ] Payment modal: large 56px+ payment buttons, easy to tap
- [ ] qty +/- buttons in cart: 36px (vs 28px before) — fingers don't fight
- [ ] Receipt print: Print Receipt button works, only the 80mm receipt prints

### iPad Pro (1024×1366 landscape)
- [ ] Sidebar: visible as static rail (240px expanded or 72px collapsed)
- [ ] POS: side-by-side products + cart layout
- [ ] Everything else looks like desktop

### Desktop
- [ ] Hamburger button is HIDDEN (md+ breakpoint)
- [ ] Action buttons in tables fade-in on hover (only on devices with `(hover: hover)`)
- [ ] Sidebar collapse chevron at the bottom of sidebar still works

## Print/PDF specifics (the things this engine can't auto-test)
- [ ] Invoice print on real printer: page breaks correctly, table doesn't split a row mid-page
- [ ] PDF download in a different language: copy/paste the body — text is selectable (not rasterized)
- [ ] Receipt print on a real thermal 80mm printer (if one is available) — alignment, no cropping
- [ ] Print preview in Firefox AND Chrome AND Edge — render is consistent

## Multi-user concurrency
- [ ] Two browser windows logged in as admin + cashier simultaneously
- [ ] Cashier raises a POS invoice → admin's invoice list refreshes (manual reload OK)
- [ ] Both attempt to edit the same invoice → no obvious data corruption

## Backup & restore safety
- [ ] Edit business profile → take a backup
- [ ] Change business profile → import backup → original profile restored
- [ ] Verify users + admin password are NOT touched by import

## What the e2e WILL catch
You can re-run any time with: `npm run test:e2e`

It exercises 66 scenarios across auth, settings, logo, users, demo data, parties, products, invoices, payments, expenses, reports, backup, and POS. Run it after any backend change before deploying.
