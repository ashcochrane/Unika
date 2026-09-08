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
| Customer accounts UI (hosted)              | —                                      |
| Accounting handoff (sync app — see 7a)     | —                                      |

**One inventory pool.** A trade order and a retail order decrement the same
stock, appear in the same Orders list, dispatch through the same flow, and book
through the same accounting sync.

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
ex-GST, so this derives cleanly.

**This is admin configuration, not code.** A B2B catalog applies either a
percentage adjustment against base prices or explicit per-variant prices, set in
the Shopify admin. Office staff change the trade rate whenever they like; no
developer, no deploy. The rate therefore does **not** block the build — it is a
value entered before launch.

Quantity rules: enforce 9-pack increments on ColorFill tubes; minimums per
variant as required.

---

## 4a. Who manages what

A deliberate goal: everyday operation should not require a developer.

| Everyday staff, in Shopify admin               | Requires a developer   |
| ---------------------------------------------- | ---------------------- |
| Trade prices (catalog % or per-variant)        | Contextual GST display |
| Bulk discount bands (automatic discounts)      | Trade-aware navigation |
| Companies, locations, buyers                   | ColorFill order grid   |
| Payment terms per company location             | Colour Matcher → cart  |
| Quantity rules, 9-pack increments              |                        |
| Approving trade applications                   |                        |
| Invoice and statement app settings (section 7) |                        |
| Products, inventory, orders (as today)         |                        |

Anything in the left column is a setting. If a change that ought to be
operational needs a code change, the design has gone wrong.

## 5. Money

Trade settles by **bank transfer** — a manual payment method, which incurs
**no Shopify transaction fees**. This is the core of the margin strategy and
must be preserved. Card rates on this plan are 2.45% + $0.30; avoiding them on
trade volume is the point.

Native payment terms give per-order Net terms, overdue status, and up to five
automated reminders. Consolidated month-end statements are **not** native — that
is the one thing built here.

---

## 6. Customer accounts — already modern

**Verified 2026-09-08:** `/account/login` 302-redirects to
`account.unika.co.nz`. The store is on modern customer accounts already, so the
B2B prerequisite is met and no migration is required.

This section previously described the migration as the project's largest risk,
with a rollback plan and a customer comms requirement. All of that was
unnecessary. The assumption came from `templates/customers/*.json` existing in
the repo; those are leftovers from before the store was migrated, not evidence
of the current account system.

`templates/customers/*.json` and `sections/main-account.liquid` are dead code
and can be removed. Deleting them is a live change on merge, so treat it as its
own deliberate step.

## 7. Invoices and statements — buy, do not build

An earlier draft of this spec proposed building a Node service for invoice and
statement PDFs plus a custom customer account extension. **That was wrong.**
Off-the-shelf apps cover it, and the project is better without a codebase to
maintain.

| App                       | Cost                   | Invoices                                                       | Statements                 | Customer self-serve                          | B2B Companies              |
| ------------------------- | ---------------------- | -------------------------------------------------------------- | -------------------------- | -------------------------------------------- | -------------------------- |
| **Sufio**                 | $19–49/mo              | Wholesale pricing, PO numbers, synced to Shopify payment terms | No                         | **Embedded in customer accounts, all plans** | Yes                        |
| **AReceivables**          | $25.99/mo (Enterprise) | Yes                                                            | Periodic statements        | Storefront-facing on Enterprise              | Purpose-built              |
| **PT2 Statement Printer** | $30/mo (Plus tier)     | Yes                                                            | Yes, plus AR aging reports | Merchant-side only                           | Plus tier                  |
| Streamlined               | —                      | Yes                                                            | Monthly                    | —                                            | Syncs QuickBooks, not MYOB |

### Recommendation

**Trial AReceivables Enterprise first** — one app covering statements, invoices,
reminders, outstanding balance and customer-facing access. Caveat: 3.2 stars
from only five reviews, so trial rather than commit.

**Fallback: Sufio + PT2 Statement Printer ($49/mo combined).** Sufio is far more
established and owns invoicing and the customer account surface properly; PT2
handles statements and AR aging.

### Acceptance test

The same test as the accounting sync in section 7a:

> An order with payment terms, left unpaid — does the app see it, invoice it at
> trade pricing, and roll it into a month-end statement?

### Consequence

**The trade portal has no custom code.** What was Phase 3 — a Node service with
Postgres, object storage and hosting, plus a bespoke customer account extension
— is now app configuration. The only custom work left in the whole project is
the storefront theme work in section 9.

## 7a. Accounting sync — replace MYOB Sync

**MYOB Sync ($19/mo) must be replaced.** 2026 reviews report payment syncing
broken since 12 March 2026, the app unsupported for over a month with developers
not answering email, products duplicating in Shopify, and other products failing
to sync. The trade launch cannot rest on it.

### The single acceptance test

> Create an order with payment terms, leave it unpaid. Does it appear in MYOB as
> an **open invoice, with the correct due date and customer**?

None of the candidates document net-terms behaviour, so this cannot be settled
from documentation. It is also the exact failure mode that would break a trade
launch: net-30 orders sit unpaid for a month, and a sync that only fires on
payment leaves revenue unrecognised and no debtor ledger.

### Candidates

|                  | Cost                 | Model                | Verdict                     |
| ---------------- | -------------------- | -------------------- | --------------------------- |
| MYOB Sync        | $19/mo               | per-order            | Leave — broken, unsupported |
| Amaka            | Free (≤60 orders/mo) | **daily summary**    | Rejected — see below        |
| ERP Integrations | $25/mo               | per-order, real-time | **Lead candidate**          |
| Dashi            | —                    | per-invoice          | Trial alongside             |
| InSyncer         | —                    | ERP-level, beta      | Rejected — see below        |

**Amaka is rejected despite being free.** It posts a daily _summary_ of sales as
a single invoice. That suits retail, but trade on net terms needs a per-customer
invoice with a due date for MYOB to carry a debtor ledger. Free would cost the
capability being built.

**InSyncer is rejected** because it treats AccountRight as the source of truth
and pushes into Shopify — the inverse of this design, where Shopify owns
products, pricing and inventory. It is also still in beta.

**Do not build this.** MYOB's API is available, but accounting sync is a solved
problem that should be maintained by someone else — the same reasoning that
applies to invoices and statements in section 7.

## 8. Portal UI — what buyers actually get

**No custom extension is built.** The portal is Shopify's hosted customer accounts,
extended by the invoice/statement app from section 7.

### Native, verified

| Capability                                                 | Native                      |
| ---------------------------------------------------------- | --------------------------- |
| Trade prices while browsing                                | Yes — storefront, automatic |
| Order history                                              | Yes                         |
| Reorder past purchases                                     | Yes                         |
| Amount owed and due date, per order                        | Yes                         |
| Order shows **Overdue** once the term expires              | Yes                         |
| **Buyer pays an outstanding order themselves — "Pay now"** | Yes                         |
| Pay by card **or manual method such as bank deposit**      | Yes                         |
| Automated payment reminders, up to five                    | Yes                         |
| PO number at checkout                                      | Yes                         |
| Order tracking and fulfilment status                       | Yes                         |
| Multiple buyers at one company sharing order visibility    | Yes                         |

Shopify's docs are explicit that a buyer can "log in to customer accounts, select
an order, and pay for it" any time before the due date. Combined with automated
reminders, most of receivables is handled without an app.

### Gaps, and what closes them

| Gap                                                           | Closed by                        |
| ------------------------------------------------------------- | -------------------------------- |
| Invoice PDF download                                          | Sufio / AReceivables (section 7) |
| Consolidated monthly statement                                | AReceivables / PT2 (section 7)   |
| Aggregate outstanding across all orders — native is per-order | AReceivables                     |
| Saved lists, quick order by SKU                               | Theme work (section 9)           |
| Credit limits                                                 | Not native; out of scope for v1  |

### One gap that cannot be closed on this plan

**A company admin cannot add their own colleagues.** The app built for this —
B2B User/Location Admin Portal — is **$39/mo and requires Shopify Plus**, so it is
unavailable at any price below Plus.

Consequence: when a joinery shop wants a second buyer, staff add them in the
Shopify admin. At this scale that is a two-minute job, and most distributors
prefer that control. It is a known limitation, not an oversight.

### Restricting B2B payment methods needs an app — PayRules stays

The "Pay now" button offers whatever payment methods are enabled. A trade
customer paying by **card** costs 2.45% + $0.30, which defeats the bank-transfer
margin strategy in section 5 entirely.

**There is no native way to prevent this.** Shopify's own documentation states
that in blended stores "payment methods that you set up are available to all
customers by default", and offers only three routes: the Checkout Blocks app, a
third-party app, or the Payment Customization Function API.

Earlier drafts of this spec listed **PayRules ($4.99/mo) as removable** once
native B2B payment terms were configured. That was wrong. PayRules conditionally
hides and shows payment methods, which is precisely and only how this is solved.
**It stays.** Verify it can target B2B customers or companies; if it cannot, use
Checkout Blocks instead.

Note the plan nuance: the Payment Customization Function API is documented as
available on all plans, but _custom_ apps containing Functions are Plus-only. An
App Store app using that API works here; writing one does not.

## 9. Storefront work — required for "easy to use", not optional

Native B2B makes trade **functional**. It does not make it **good**. Dawn 15.2.0 is
already B2B-aware — volume pricing and quantity rules are handled across
`main-product.liquid`, `price.liquid`, `card-product.liquid`, `cart-drawer.liquid`,
`main-cart-items.liquid`, `buy-buttons.liquid`, `quantity-input.liquid` and
`quick-order-list-row.liquid` — so trade pricing renders with **zero changes**.

What is missing is the buying experience. Measured against trade commerce best
practice, these are real gaps:

| Gap                                   | Why it matters                                                                                                                                                                     | Effort |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| **ColorFill is a 23-option dropdown** | A joinery shop restocking eight colours runs the same loop eight times. Worst UX on the site, on the best-selling product. `quick-order-list` already exists in the theme, unused. | Small  |
| **Colour Matcher is a dead end**      | A fabricator finds "Formica → CF402" then hunts the product manually. This tool is the business's genuine differentiator and it does not sell anything.                            | Medium |
| **No trade entry point anywhere**     | A logged-in trade customer lands on the retail homepage. Reordering — the primary trade behaviour — is buried.                                                                     | Small  |
| **No trade application flow**         | No way to become a trade customer. Shopify Forms (already installed, free) plus Flow covers it.                                                                                    | Small  |
| **Ex-GST shown to everyone**          | Correct for trade, wrong for consumers. Must be driven by market.                                                                                                                  | Small  |

Every one of these also improves the retail experience, and none of them block
launch — but shipping trade without them delivers something functional rather than
something good, which is not the goal.

Follows Dawn conventions: `{% style %}` for section-scoped CSS, `assets/*.css` for
shared, and **always honour `color_scheme`** (37 of 57 sections do).

### Colour Matcher caveat

`sections/metaobject-datatable.liquid` paginates by 300 against a documented
maximum of 250. It is load-bearing: there are **299** laminate entries and
DataTables searches client-side over whatever Liquid rendered. **At 299/300 this is
one entry away from silently truncating.** Rework before adding laminates. jQuery
is pulled in solely for DataTables here.

### Company location picker — added after review

shopify.dev names a **company location picker** as a B2B theme requirement, and
this spec had missed it. A buyer whose company has several sites must be able to
choose which one they are purchasing for, because it drives both catalog pricing
and delivery. Liquid provides `customer.company_available_locations`,
`location.current?` and `location.url_to_set_as_current` — a link, no form needed.

### Product pages carry no tax note at all

Verified on the live store: `GST Excl.` exists in exactly one place,
`snippets/card-product.liquid:207`, so it renders on collection pages (16 times on
`/collections/all`) but **not on product pages**. A customer viewing a ColorFill
product page has no indication whether GST is included. That is arguably worse
than the label being wrong for retail.

### Implementation plans

| Plan                                                        | Covers                                                        |
| ----------------------------------------------------------- | ------------------------------------------------------------- |
| `plans/2026-09-08-colorfill-ordering-and-colour-matcher.md` | ColorFill grid, Colour Matcher → cart                         |
| `plans/2026-09-08-trade-screens-and-onboarding.md`          | Location picker, trade hub, application, GST note, navigation |

**Open question for the accountant:** whether retail prices should render
GST-inclusive. The plans make the _label_ accurate but do not change prices —
that is a tax-presentation decision with NZ consumer-law implications, and
Shopify's native tax settings are a better lever than arithmetic in Liquid.

## 10. Phases

**Phase 0 — de-risk (no build)**

- **Replace the accounting sync** (section 7a). Trial ERP Integrations and Dashi
  against the unpaid-order acceptance test; keep whichever passes.
- Remove MYOB Sync and the duplicate "Xero, QuickBooks or MYOB Sync" app once a
  replacement passes.
- Confirm nothing uses `templates/page.wholesale-partner.json`.
- Create or confirm a dedicated unpublished dev theme.

**Phase 1 — native B2B core (mostly config)**
Runbook: `docs/superpowers/plans/2026-09-08-phase-1-b2b-runbook.md`
Modern customer accounts migration. Companies, locations, buyers. NZ B2B market

- NZ Trade catalog. Payment terms. PO numbers. Quantity rules. Bank transfer
  payment method. Order-level bulk discount bands. Trade application via Shopify
  Forms + approval via Flow.

**Phase 2 — storefront (section 9)**
Required for the portal to be good rather than merely functional.

**Phase 3 — AR (app configuration, not a build)**
Trial and configure the invoice/statement app per section 7.

**Phase 4 — Australia** (section 11)

---

## 11. AU readiness

### ✅ RESOLVED 2026-09-08: AUD works on Grow

Tested directly rather than researched, because Shopify's documentation
contradicts itself. An Australia market with AUD currency was created on the live
store and the storefront rendered `Australia | AUD $` with prices as `$15.00 AUD`,
`$74.00 AUD`. **No plan upgrade is required for Australian currency.**

Consequences:

- **One store, two markets.** A second Shopify store (~$2,328/yr) and Shopify
  Advanced (~$3,588/yr) are both unnecessary. Total stays at ~$1,488/yr.
- AU trade runs from `unika.co.nz`, sidestepping the `unika.com.au` trademark
  problem entirely.
- Catalog 2 is reserved for AU Trade as planned.

### Decision 2026-09-08: AU deferred until stock is held in Australia

Confirmed with the business. Australia is **not** blocked technically — the
currency test above proved it works on the current plan. It is deferred because
the business is not ready to stock or fulfil from Australia yet.

Nothing needs configuring now. When AU stock exists, the market takes about a
minute to recreate and the AU-readiness rules below mean the rest is data entry
rather than rework.

**The test market was removed after testing.** Left active it would show
Australian visitors AUD prices with every product marked Sold out — worse than
the prior state, where they at least saw prices they could not check out with.

### ⚠️ Known: nothing is purchasable in the AU market until shipping exists

During the same test, every product showed **Sold out** in the AU market while NZ
showed 22 of 22 ColorFill variants available. Verified: 9 "Sold out" badges with
`?country=AU` against 1 on the NZ homepage.

Most likely cause is **no shipping zone covering Australia** — shipping rates are
explicitly "NZ Only" and the entire courier stack is GoSweetSpot, which does not
operate there. Shopify marks products unavailable to a market it cannot ship to.

To resolve when AU is built:

1. Settings → Shipping and delivery → add a zone containing Australia
2. Settings → Markets → Australia → Products → confirm products are published
3. Assign the AU warehouse as a fulfilment location and set order routing

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

| Risk                                                                         | Severity | Mitigation                                                            |
| ---------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------- |
| Accounting sync mishandles unpaid orders                                     | **High** | Section 7a — the single Phase 0 acceptance test                       |
| MYOB Sync is actively broken (payment sync down since Mar 2026, unsupported) | **High** | Replace it — section 7a                                               |
| Accounts migration breaks customer login                                     | **High** | Section 6 rollback plan                                               |
| Colour Matcher truncation at 300                                             | Medium   | Documented; rework before adding laminates                            |
| Local clone drifts from `origin/main`                                        | Medium   | `git pull` before work and before merge — now a documented convention |
| Merging to `main` deploys instantly                                          | Medium   | Branch + unpublished dev theme; PR template check                     |

---

## 13. Open questions

1. Which accounting sync passes the section 7a acceptance test — ERP
   Integrations or Dashi? _(Phase 0 — blocks Phase 1)_
2. Is "Copy of Unika/main" (130931064929) a backup, or usable as the dev theme?
3. Does any live page use `templates/page.wholesale-partner.json`?
4. What Net terms — Net 30, or 20th of the month following (NZ convention)?
5. Credit limits per company in v1, or deferred?
6. **What is the trade rate?** Not blocking — it is a value staff enter into the
   catalog in the admin (section 4). Needed before launch, not before build.
7. **What are the bulk discount bands?** Layer 2 needs concrete thresholds — e.g.
   spend $1,000 → 5%, $2,500 → 10%. Values are a commercial decision; the
   mechanism does not depend on them, so this does not block design.
