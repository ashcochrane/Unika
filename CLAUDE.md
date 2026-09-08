# Unika NZ — Shopify theme

Shopify theme for **unika.co.nz**, operated by **Beauty Craft** (NZ distributor for the
UK brand Unika — the brand is licensed, not owned; Beauty Craft holds NZ **and** AU
distribution rights).

Store: `unika-nz.myshopify.com` · Dawn-based · Tailwind (prefixed `tw-`) + Vite.

## ⚠️ `main` deploys to the live store — and always `git pull` first

The Shopify GitHub integration is wired to `main` and **works in both directions**:

- Theme-editor saves are committed back automatically as `shopify[bot]`
  ("Update from Shopify for theme Unika/main").
- **Any commit you push to `main` deploys to the live storefront immediately.**

So `main` moves without you. In Sept 2026 a local clone was found sitting 17 months
behind `origin/main` (April 2025 vs January 2026, 19 unfetched bot commits). Working
from it and merging would have reverted real customer-facing content — the announcement
bar, product template ordering, `config/markets.json`.

**Always `git fetch && git pull` before starting work and before merging.** Rebase
feature branches onto the latest `main` rather than assuming your base is current.

All work happens on branches; merging to `main` is a deploy. Preview with
`npm run push:dev` against the unpublished dev theme.

## What this business actually is

A worktop/benchtop fabrication consumables supplier — ColorFill (colour-matched
jointing compound, 23 colour variants), TopSeal, MitreBond, EasiBolt, jigs, cleaners.
The customer is a **joinery shop restocking**, not a consumer browsing. Storefront
prices display **ex-GST**, which is a trade convention already in place.

~52 products. Custom templates exist per product line (`product.colorfill.json`,
`product.mitre.json`, `page.color-matcher.json`, etc).

## Current project: NZ trade portal

Building B2B ("trade") alongside the existing retail store, as a **blended store**
— one store, shared inventory, shared orders, shared fulfilment. Only _who the
customer is_ and _what price they see_ differ.

**Platform decision: stay on Shopify, Grow plan, native B2B.** Considered and
rejected: Shopify Advanced ($399/mo, only needed for AU multi-currency), SparkLayer
($149/mo + 100 order/month cap), a custom portal on draft orders (more code to own
than the problem warrants), MedusaJS self-hosting (would require rebuilding the
GoSweetSpot courier stack, MYOB sync, checkout and storefront for ~$3k/yr saving),
BigCommerce (B2B is Enterprise-only, $1,499+/mo).

Trade pricing model: **flat trade price per market, bulk earned automatically.**
Volume price breaks are per-variant and therefore useless for assorted ColorFill
orders — use **order-level automatic discounts scoped to the B2B market** instead,
so a cart of 8 different colours still earns its discount.

### Phases

0. De-risk: test MYOB Sync against an **unpaid** order; remove duplicate sync app.
1. Native B2B config + **classic → modern customer accounts migration** (the only
   genuinely risky step; modern accounts are mandatory for B2B).
2. Storefront: ColorFill order grid (wire up the unused `quick-order-list` sections),
   **Colour Matcher → add to cart**, contextual GST display.
3. AR: statement + invoice PDF service, monthly email, one customer account UI
   extension for balance/invoice download.
4. AU: add market + catalog + location. Structure is built for this from day one.

### AU-readiness rules (apply to all new work)

- Never hardcode NZD or `$` — always `money_with_currency`.
- Drive inc/ex-GST display from the **market**, not a theme constant.
- Trade pricing is a **rate per market**, never a hardcoded NZ number.
- Catalog slots: NZ Trade = 1, AU Trade = 2, **never spend slot 3** (non-Plus cap is 3).
- Statements are keyed `{store, company, period, currency}` — never assume one store.

## Conventions

- Tailwind classes are prefixed **`tw-`**.
- Liquid uses double quotes (see `.prettierrc.json`); JS/CSS single quotes.
- Tailwind is configured but **currently unused** — zero `tw-` classes exist and
  `assets/app.css` is neither built nor referenced by `layout/theme.liquid`. The
  toolchain is retained for Phase 2. See README to activate.
- Run `npm run lint` before committing.

## Known issues / gotchas

- `templates/page.wholesale-partner.json` is vestigial — it renders a _disabled_
  "Technical Documents" block. Verify no page uses it before deleting.
- MYOB Sync ($19/mo) has 2026 reviews reporting outages and silent sync failures.
  All AR depends on it. Alternative: MYOB Integration by ERP Integrations ($25/mo).
- App to remove: the duplicate "Xero, QuickBooks or MYOB Sync".
- **PayRules stays.** There is no native way to hide card payment from B2B
  customers — Shopify offers only Checkout Blocks, a third-party app, or the
  Payment Customization Function API. PayRules is how the bank-transfer margin
  strategy is actually enforced.
- GoSweetSpot (3 apps) is **NZ-only**. Starshipit covers NZ + AU — switch when AU lands.

## Money

Trade settles by **bank transfer**, a manual payment method, which incurs **no Shopify
transaction fees**. Keep it that way — it is the core of the margin strategy.
