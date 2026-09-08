# Unika NZ — Trade Portal Design

**Date:** 2026-09-08
**Status:** Draft for review
**Store:** `unika-nz.myshopify.com` · Shopify **Grow** ($948 USD/yr)

---

## 1. Context

Beauty Craft distributes the UK **Unika** brand in New Zealand and Australia
(both territories confirmed; the brand is licensed, not owned). The store sells
worktop fabrication consumables — ColorFill, TopSeal, MitreBond, EasiBolt, jigs,
cleaners. 52 products, 299 laminate cross-reference entries.

The real customer is a **joinery shop restocking**, not a consumer browsing.
Evidence: storefront prices already display ex-GST, and desktop traffic runs
~166 sessions/30 days. Retail is not where the return is.

Today there is no trade infrastructure. Customer accounts are Dawn's stock,
unstyled order table. Trade orders happen by phone, email and manual invoicing.

### Goal

Let trade customers self-serve: log in, see their price, order fast, buy on
account, and retrieve their own invoices and monthly statements — without
phoning the office.

### Non-goals

- Retail conversion optimisation. Performance is already green (LCP 1550ms,
  INP 48ms, CLS 0) and traffic is low. Not where effort belongs.
- Replacing MYOB. It stays the accounting system of record.
- Australia in v1. Designed for throughout; built in Phase 4.
- Shopify Plus. Nothing in this design requires it.

---

## 2. Platform decision

**Stay on Shopify. Grow plan. Native B2B. Blended store.**

One store serving both D2C and B2B, sharing inventory, orders and fulfilment.
Shopify's own guidance describes a blended store as the fit when you "sell
similar products to both B2B and D2C, share inventory, and have the same staff
managing both" — which is exactly this business.

### Alternatives considered and rejected

| Option                           | Why not                                                                                                                                                                                         |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shopify Advanced + native B2B    | ~$399/mo. Only buys contextual checkout, needed for AU currency — a Phase 4 concern.                                                                                                            |
| SparkLayer ($149/mo Growth tier) | Invoicing is not in the $49 Starter tier. Growth caps at 100 B2B orders/month; Pro ($299) exceeds Advanced's cost.                                                                              |
| Custom portal on draft orders    | `priceOverride` makes it technically viable on any plan, but it means owning an entire commerce surface for a solo developer. More code than the problem warrants.                              |
| MedusaJS self-hosted             | Hosting is $50–150/mo, but requires rebuilding the GoSweetSpot courier stack, MYOB sync, checkout and storefront. ~$3k/yr saving against tens of thousands of build plus permanent maintenance. |
| BigCommerce B2B Edition          | Enterprise-only, $1,499+/mo published.                                                                                                                                                          |

**What would change this:** hitting the 3-catalog cap (won't for NZ+AU under a
flat-price model), or AU forcing Advanced and preferring to build over pay.

---

## 3. Architecture

Nothing forks between retail and trade except **who the customer is** and **what
price they see**.

| Shopify owns                               | Custom service owns                    |
| ------------------------------------------ | -------------------------------------- |
| Products, variants, inventory              | Invoice + statement PDFs               |
| Orders, fulfilment, dispatch (GoSweetSpot) | Monthly statement generation and email |
| Companies, locations, buyers               | —                                      |
| Catalogs and trade pricing                 | —                                      |
| Customer accounts UI (hosted)              | One full-page extension for AR         |
| Accounting handoff (MYOB Sync)             | —                                      |

**One inventory pool.** A trade order and a retail order decrement the same
stock, appear in the same Orders list, dispatch through the same flow, and book
through the same MYOB Sync.

---

## 4. Pricing model

Confirmed with the business: **flat trade price per market; bulk earned
automatically.** No per-account negotiated rates.

### The ColorFill constraint

Shopify's volume price breaks apply **per variant**, and quantities do not
combine across variants — Shopify's docs state a customer cannot combine 5 grey
hats and 5 blue hats to meet a minimum. A joinery shop ordering **one each of
eight ColorFill colours** would therefore earn nothing under variant-level
volume pricing, despite it being a real order.

### Three layers

| Layer               | Mechanism                                                    | Answers                | Cost                    |
| ------------------- | ------------------------------------------------------------ | ---------------------- | ----------------------- |
| 1. Base trade price | B2B catalog, one per market                                  | "Are you trade?"       | 1 of 3 catalog slots    |
| 2. Bulk reward      | **Order-level automatic discounts scoped to the B2B market** | "How much in total?"   | Free, unlimited         |
| 3. SKU depth        | Volume price breaks in the catalog                           | "How deep on one SKU?" | Free, 10 breaks/product |

Layer 2 is what makes the assorted ColorFill order work — automatic discounts
apply on top of catalog prices and evaluate the **whole cart**. Restrict them to
B2B by creating a B2B market and setting it as the discount's eligibility.

Layer 3 applies only to products bought in single-SKU depth — MitreBond cartons,
TopSeal, cleaners, bolts. **Never put volume breaks on ColorFill colours.**

### Implementation

Trade price = retail × (1 − market trade rate). Retail prices are already
ex-GST, so this derives cleanly. Store the rate and the discount bands **as
data**, not hardcoded, so AU is a new row rather than a code change.

Quantity rules: enforce 9-pack increments on ColorFill tubes; minimums per
variant as required.

---

## 5. Money

Trade settles by **bank transfer** — a manual payment method, which incurs
**no Shopify transaction fees**. This is the core of the margin strategy and
must be preserved. Card rates on this plan are 2.45% + $0.30; avoiding them on
trade volume is the point.

Native payment terms give per-order Net terms, overdue status, and up to five
automated reminders. Consolidated month-end statements are **not** native — that
is the one thing built here.

---

## 6. The customer accounts migration

**Native B2B requires modern customer accounts. Legacy accounts are explicitly
unsupported.** This is the only step with customer-visible disruption and the
single largest risk in the project.

Consequences:

- `templates/customers/*.json` and `sections/main-account.liquid` become dead.
- The account surface becomes Shopify-hosted and is no longer themeable in
  Liquid; it is extended with customer account UI extensions.
- Existing customers experience a changed login flow.

**Do this early** — before investing in theme work, not after.

### Rollback

Modern accounts can be switched back to legacy in admin, which is the escape
hatch if login breakage is discovered. But B2B data (companies, catalogs) is
unusable while on legacy. So:

1. Enable on a quiet day, with a support inbox watched.
2. Announce to existing customers in advance with a "how to log in now" note.
3. Keep the legacy templates in git (do not delete) until 30 days have passed
   without incident.
4. Only then remove `templates/customers/*` and `main-account.liquid`.

---

## 7. Statement and invoice service

The only genuinely custom component.

**Source of truth: Shopify order data.** MYOB stays the accounting ledger but is
_not_ a runtime dependency — the MYOB API does not expose customer statements
(invoice CRUD and an `/email` endpoint exist; statements do not appear in the
documented API). Coupling the customer-facing portal to MYOB would add OAuth and
company-file auth for no gain.

### Contract

```
GET  /api/companies/:companyId/summary   -> { outstanding, currency, overdueCount }
GET  /api/companies/:companyId/invoices  -> [ { orderId, number, date, total, status, url } ]
GET  /api/companies/:companyId/statements-> [ { period, total, url } ]
GET  /api/documents/:documentId          -> PDF (signed, short-lived URL)
```

Statements are keyed `{store, company, period, currency}` — never assume one
store or one currency.

### Stack

Next.js on ~$25/mo hosting · Postgres · Shopify Admin GraphQL via a custom app ·
Postmark or Resend · React-PDF · R2/S3 for documents. Kept deliberately boring.

### Monthly job

On the 1st: for each company with orders in the prior month, aggregate, render a
PDF, store it, email the billing contact. Idempotent — safe to re-run.

---

## 8. Portal UI

One **customer account UI extension** (full-page). Available on all plans, and
supports external network calls with `network_access = true` plus
`Access-Control-Allow-Origin` on the endpoint (extensions run in a Web Worker
with a null origin).

Scope: outstanding balance, invoice list with download, statement history.
Nothing else in v1.

Everything else — order history, reorder, addresses — is Shopify's hosted
account UI, free and maintained by them.

---

## 9. Storefront work

Theme changes, in `feature/trade-portal`. Follows Dawn conventions: component
CSS in `assets/`, `{% style %}` for section-scoped rules, and **always honour
`color_scheme`** (37 of 57 sections do).

1. **ColorFill order grid.** `sections/quick-order-list.liquid` and
   `snippets/quick-order-product-row.liquid` already exist and are unreferenced
   (theme-check reports the snippet as orphaned). Wire them up. 23 colours behind
   a dropdown is the single worst thing on the site for the target customer.
2. **Colour Matcher → add to cart.** Currently a dead-end lookup table; a
   fabricator finds "Formica → CF402" then hunts the product manually. Making it
   an ordering surface is the highest-value differentiator in this project.
3. **Contextual GST display** — driven by market, not a theme constant.
4. **Trade-aware navigation** — a trade entry point exists nowhere today.

### Colour Matcher caveat

`sections/metaobject-datatable.liquid` paginates by 300 against a documented
Shopify maximum of 250. It is load-bearing: there are **299** laminate entries
and DataTables searches client-side over whatever Liquid rendered. **At 299/300
this is one entry away from silently truncating.** Rework before adding
laminates. jQuery is pulled in solely for DataTables here.

---

## 10. Phases

**Phase 0 — de-risk (no build)**

- Test MYOB Sync against an **unpaid** order. Net-30 orders sit unpaid for a
  month; if the sync only fires on payment, revenue recognition breaks on day
  one. Highest-value cheap test in the project.
- Remove the duplicate "Xero, QuickBooks or MYOB Sync" app.
- Confirm nothing uses `templates/page.wholesale-partner.json`.
- Create or confirm a dedicated unpublished dev theme.

**Phase 1 — native B2B core (mostly config)**
Modern customer accounts migration. Companies, locations, buyers. NZ B2B market

- NZ Trade catalog. Payment terms. PO numbers. Quantity rules. Bank transfer
  payment method. Order-level bulk discount bands. Trade application via Shopify
  Forms + approval via Flow.

**Phase 2 — storefront** (section 9)

**Phase 3 — AR** (sections 7 and 8)

**Phase 4 — Australia** (section 11)

---

## 11. AU readiness

Apply to all work from Phase 1:

- Never hardcode NZD or `$` — always `money_with_currency`.
- Inc/ex-GST display driven by **market**, not a constant.
- Trade pricing is a **rate per market**, never a hardcoded number.
- Catalog slots: NZ Trade = 1, AU Trade = 2. **Never spend slot 3.**
- Statements keyed `{store, company, period, currency}`.
- Shipping profiles + location groups so AU is a new zone.
- Capture a **tax registration metafield** on company (NZ GST # / AU ABN) from
  Phase 1. Cheap now, ugly to retrofit.

### Phase 4 decisions (not now)

- **Plan:** one store on Advanced (~$399/mo, contextual checkout for AUD) **or**
  a second Grow store (~$210 total). With physically separate warehouses holding
  separate stock there is nothing to sync, which makes two stores much stronger
  than usual. Build must not assume one store.
- **Carrier:** GoSweetSpot (3 apps) is NZ-only. **Starshipit** covers NZ and AU
  from ~$30/mo and would collapse three apps into one.
- **Domain:** `unika.co.au` redirects to `unika.co.uk` and asking is awkward.
  `.com.au` needs an Australian presence _and_ likely an Australian trademark
  that Unika UK would own. Run AU trade from `unika.co.nz` — trade buyers live in
  a portal, not in search results.
- **Tax:** holding stock in Australia is a far stronger nexus than remote
  selling. Accountant question, not an engineering one.

---

## 12. Risks

| Risk                                                                                     | Severity | Mitigation                                                            |
| ---------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------- |
| MYOB Sync mishandles unpaid orders                                                       | **High** | Phase 0 test before anything else                                     |
| MYOB Sync reliability — 2026 reviews report outages, silent failures, unanswered support | **High** | Evaluate MYOB Integration (ERP Integrations, $25/mo) as fallback      |
| Accounts migration breaks customer login                                                 | **High** | Section 6 rollback plan                                               |
| Colour Matcher truncation at 300                                                         | Medium   | Documented; rework before adding laminates                            |
| Local clone drifts from `origin/main`                                                    | Medium   | `git pull` before work and before merge — now a documented convention |
| Merging to `main` deploys instantly                                                      | Medium   | Branch + unpublished dev theme; PR template check                     |

---

## 13. Open questions

1. Does MYOB Sync handle unpaid orders? _(Phase 0 — blocks Phase 1)_
2. Is "Copy of Unika/main" (130931064929) a backup, or usable as the dev theme?
3. Does any live page use `templates/page.wholesale-partner.json`?
4. What Net terms — Net 30, or 20th of the month following (NZ convention)?
5. Credit limits per company in v1, or deferred?
6. **What is the trade rate?** Section 4 defines trade price as
   `retail × (1 − market trade rate)` but the rate itself is a business input and
   is not yet decided. Needed before Phase 1 catalog setup.
7. **What are the bulk discount bands?** Layer 2 needs concrete thresholds — e.g.
   spend $1,000 → 5%, $2,500 → 10%. Values are a commercial decision; the
   mechanism does not depend on them, so this does not block design.
