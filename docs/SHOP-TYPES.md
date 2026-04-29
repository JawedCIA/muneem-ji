# Shop types & feature toggles

Muneem Ji has six per-shop **feature toggles**. The first-run setup wizard asks which kind of shop you run and flips these toggles to sensible defaults — but every toggle is independent and can be flipped later in **Settings → Business Profile → Features**.

This page documents what each shop archetype enables.

---

## The six toggles

| Toggle                | Default | What it controls                                                                                       |
| --------------------- | :-----: | ------------------------------------------------------------------------------------------------------ |
| `feature.pos`         | ON      | Tablet POS sidebar item, /pos route, POS sale workflow                                                 |
| `feature.quotations`  | ON      | Quotations sidebar item + page; "Convert to Invoice" flow                                              |
| `feature.banking`     | ON      | Banking sidebar item, bank reconciliation, statement CSV import                                        |
| `feature.recurring`   | OFF     | Recurring invoices sidebar item, automatic generation cron                                             |
| `feature.serials`     | OFF     | Per-unit serial / IMEI tracking on products + invoices, /serials page, warranty register               |
| `feature.batches`     | OFF     | Per-line batch + expiry tracking on products + invoices, /batches page, expiry register                |

Hiding a feature **never deletes data** — flip the toggle back on and everything reappears.

---

## Shop archetypes (setup wizard presets)

The setup wizard's "What kind of shop is this?" question maps to these toggle sets. The mapping lives in `client/src/pages/Setup.jsx → applyShopType`.

| Archetype                    | POS | Quotations | Banking | Recurring | Serials | Batches |
| ---------------------------- | :-: | :--------: | :-----: | :-------: | :-----: | :-----: |
| 🏬 **General store**         | ON  | ON         | ON      | OFF       | OFF     | OFF     |
| 💊 **Pharmacy / medical**    | ON  | ON         | ON      | OFF       | OFF     | **ON**  |
| 📱 **Electronics / appliances** | ON | ON      | ON      | OFF       | **ON**  | OFF     |
| 🍽️ **Restaurant / food**     | ON  | OFF        | ON      | OFF       | OFF     | OFF     |
| 🛠️ **Service business**      | OFF | ON         | ON      | **ON**    | OFF     | OFF     |
| 📦 **Wholesale / B2B**       | OFF | ON         | ON      | **ON**    | OFF     | OFF     |
| 💍 **Jewellery**             | ON  | ON         | ON      | OFF       | **ON**  | OFF     |
| 🔧 **Auto / repair**         | ON  | ON         | ON      | **ON**    | **ON**  | OFF     |
| ✨ **Other / mixed**         | ON  | ON         | ON      | ON        | ON      | ON      |

---

## When does it matter?

### "I'm a kirana store but I sell some medicines too"
Pick **General store** at setup, then in Settings → Features turn on `feature.batches`. Both serials and batches can coexist.

### "I'm an electronics shop that does some warranty repairs (AMC)"
Pick **Auto / repair** — it has both serials AND recurring (for AMC). Or pick Electronics and turn on Recurring later.

### "I'm a restaurant — why is Quotations off?"
Restaurants don't usually quote. If you cater events on the side, turn it back on.

### "I'm a service business — why is POS off?"
A pure service business (consulting, SaaS reseller, equipment rentals) doesn't have walk-in counter sales. If you also sell physical product, turn POS on.

---

## Adding a new feature

If you contribute a new module that should be feature-gated:

1. Add the setting key to migration `012_feature_flags.sql`'s seed (or a new migration)
2. Add an entry to `FEATURE_DEFAULTS` in `client/src/store/settings.js`
3. Add a row in **Settings → Features** (`client/src/pages/Settings.jsx → FeatureToggle`)
4. Add `feature: 'feature.yourkey'` on the Sidebar `NAV` item
5. Update `applyShopType` in `Setup.jsx` to set sensible defaults per archetype
6. Add the row to the matrix above in this file

The pattern keeps adding features cheap and reversible.
