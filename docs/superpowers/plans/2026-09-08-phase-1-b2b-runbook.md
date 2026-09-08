# Phase 1 — B2B Configuration Runbook

**Spec:** `docs/superpowers/specs/2026-09-08-unika-trade-portal-design.md`
**Store:** `unika-nz.myshopify.com` · Shopify **Grow**

> This is a **runbook, not a code plan.** Almost every step happens in the live
> Shopify admin and takes effect immediately. There is no branch to hide on.
> Work through it in order — later stages depend on earlier ones.

**Outcome:** a joinery shop can log in, see trade pricing, order with a PO number,
check out on account, and be invoiced — settling by bank transfer at **0% Shopify
fees**.

---

## Before you start

- [ ] `git pull` — Shopify pushes to `main` as `shopify[bot]`; a stale clone is how
      live content gets reverted.
- [ ] Confirm **Shopify Payments is active** (Settings → Payments). Local
      currencies require it.
- [ ] Block out a **30-day window** where someone watches the support inbox. Stage
      2 is reversible only within 30 days.

---

## Stage 1 — Free, reversible tests

Nothing here changes the customer experience. Do all of it before committing to
anything.

### 1.1 ✅ DONE — Australian currency confirmed working

Tested 2026-09-08. An Australia market with AUD currency rendered
`Australia | AUD $` and prices as `$15.00 AUD` on the live storefront.

**AUD works on Grow. No plan upgrade needed.** One store, two markets,
~$1,488/yr. A second store and Advanced are both off the table.

**Decision: AU is deferred until stock is held in Australia.** Not a technical
blocker — the capability is proven. The test market and the country selector were
both reverted afterwards; left active they would show Australian visitors AUD
prices with everything marked Sold out.

**Cause of the sold-out state, confirmed:** every product showed **Sold out** in the AU
market (9 badges with `?country=AU`, versus 1 on NZ, where 22 of 22 ColorFill
variants are available). Almost certainly **no shipping zone covers Australia** —
rates are "NZ Only" and GoSweetSpot does not operate there. Resolve during AU
build, not now:

1. Settings → Shipping and delivery → add an Australia zone
2. Settings → Markets → Australia → Products → confirm publication
3. Assign the AU warehouse as a location and set order routing

### 1.2 Replace the accounting sync

MYOB Sync is broken — payment syncing down since 12 March 2026, developers not
answering support email, products duplicating. It cannot carry a trade launch.

- [ ] Install **ERP Integrations — MYOB Integration** ($25/mo, free trial)
- [ ] Optionally trial **Dashi** alongside ($29/mo) — note it is dearer

**The acceptance test — this is the single most important check in Phase 1:**

- [ ] Create a **draft order** for a test customer
- [ ] Apply **payment terms** (Net 30)
- [ ] Mark it **pending**, not paid
- [ ] In MYOB, confirm it appears as an **open invoice, with the correct due date
      and customer**

**If it does not appear, stop.** A sync that only fires on payment leaves a month
of revenue unrecognised and no debtor ledger. Try the other candidate before
proceeding.

- [ ] Keep whichever passes. Do **not** uninstall MYOB Sync yet — Stage 5.

### 1.3 Trial the invoice / statement app

- [ ] Install **AReceivables** (free tier, then $15.99 SMB — Enterprise at $25.99
      exceeds budget)
- [ ] Confirm with the vendor which tiers include **periodic statements** and
      **automated reminders** — the pricing table does not say
- [ ] Run the same unpaid-order test: does it see the order, invoice it at trade
      pricing, and roll it into a month-end statement?

**Fallback if it disappoints:** Sufio ($19) for invoices + customer-account
download, plus PT2 Statement Printer ($30) for statements. That is $49/mo and
exceeds budget, so only take it if AReceivables fails.

### 1.4 Pre-migration breakage check

Two things break on migration and both are silent.

- [ ] **Flow** → review every workflow. Any trigger based on _legacy_ customer
      accounts **cannot be migrated** and will stop firing. List them; rebuild
      after Stage 2.
- [ ] **Customers → Segments** → look for any segment using the
      `customer_account_status` filter. That filter is legacy-only and will stop
      working. Note them.

---

## Stage 2 — ✅ NOT NEEDED: already on modern customer accounts

**Verified 2026-09-08.** `unika.co.nz/account/login` returns a 302 to
`account.unika.co.nz`, the Shopify-hosted modern customer account surface.
Legacy accounts would render the theme's `templates/customers/login.json`
with a 200.

The store was already migrated before this project began. **There is no
migration to perform, no customer comms to send, and no rollback window to
manage.** B2B can be enabled immediately.

Earlier drafts of this runbook treated the migration as the largest risk in the
project. That was based on the presence of `templates/customers/*.json` in the
repo, which are leftovers rather than evidence of the account system in use.
Checking the redirect would have settled it in seconds.

Consequence: `templates/customers/*.json` and `sections/main-account.liquid`
are dead code today. Nothing renders them. They can be deleted, but that is a
live change on merge, so do it deliberately rather than as a side effect.

## Stage 3 — ✅ COMPLETE (2026-09-08)

Configured and verified against a live test order.

| Item          | State                                                                                  |
| ------------- | -------------------------------------------------------------------------------------- |
| B2B enabled   | Companies available in admin                                                           |
| Market        | **New Zealand (Trade)** — B2B type, includes all company locations in all regions, NZD |
| Retail market | **New Zealand (Retail)** — untouched, still active                                     |
| Catalog       | **New Zealand Trade** — all products, 5% adjustment. **Catalog 1 of 3.**               |
| Test company  | Ash Test Company, approved, one location, one buyer                                    |
| Payment terms | **Net 45**                                                                             |
| Card payment  | **Blocked for B2B via PayRules**                                                       |

### The market must include _company locations_, not a country

Setting `Includes` to New Zealand creates a duplicate **region** market, and Shopify
warns it will draft the existing retail market. The B2B market is created by setting
`Includes` to **Company locations**, then enabling _"Include all existing and future
locations"_ so new trade accounts join automatically. The company list being empty at
creation time is expected and irrelevant.

### PayRules is how card payment is blocked

There is no native control (spec section 8). The rule is:

- Condition: **Company → Customer is company → If found** — matches any company,
  not a named one
- Action: **Hide**
- Methods: Shopify Payments (Credit card), Stripe (Credit card), Google Pay
  (express), Apple Pay (express), Shop Pay (express), Shop Pay Installments

The express wallets matter — they are card transactions at the same 2.45%.

**Do not add a free-text `Credit` entry.** With partial matching it also catches
"Redeemable payment method - Store credit" and would silently disable store credit.

**Verified on both sides:** card absent for the trade account, still present for
retail in an incognito session. A payment rule that is too broad fails silently, so
the retail check is not optional.

### 🔴 Live bug found while testing: shipping charged $250

The Domestic zone's rate was named "Free" with the condition _orders $250 and up*
and a **price of $250.00_* instead of $0.00. Every order over $250 — retail
included — was charged $250 freight while the announcement bar promised free
shipping. Corrected to $0.00 and verified.

This had nothing to do with B2B. It surfaced only because a full checkout was
walked end to end, and is a reason to test real flows rather than reason about them.

## Stage 4 — End-to-end verification

Use a real company you control before inviting anyone.

- [ ] Create a test **company** with a **location**
- [ ] Attach a test **customer** as a buyer
- [ ] Sign in as that customer
- [ ] **Trade prices show** on product pages, collection grids and cart
- [ ] Quantity increments enforced on ColorFill
- [ ] Add 8 different ColorFill colours → **bulk discount applies to the cart**
- [ ] Check out — **PO number field present**
- [ ] Order is created **unpaid, with payment terms and a due date**
- [ ] Customer account shows the order, amount owed and due date
- [ ] **Card is not offered** on "Pay now"
- [ ] Order reaches **MYOB as an open invoice** with the right due date
- [ ] Invoice app produces a **PDF at trade pricing**
- [ ] GoSweetSpot picks the order up for dispatch
- [ ] Wait past the due date on a second test order → confirm it shows **Overdue**
      and a reminder sends

**Any failure here stops the cutover.** Fix it before a real customer sees it.

---

## Stage 5 — Cutover

- [ ] Uninstall **MYOB Sync** (broken) — only after its replacement has passed 1.2
- [ ] Uninstall the duplicate **"Xero, QuickBooks or MYOB Sync"**
- [ ] Uninstall **PayRules** — only after 3.4 is verified
- [ ] Invite the first 2–3 friendly trade customers. **Not all of them.**
- [ ] Let those accounts run a **full billing cycle** — order, invoice, statement,
      bank transfer, reconciliation in MYOB — before inviting the rest

> Buyers are invited by staff in the admin. Self-serve user management requires a
> Plus-only app and is not available on this plan. Accepted, per the spec.

- [ ] After 30 incident-free days, delete `templates/customers/*` and
      `sections/main-account.liquid`

---

## Open questions to resolve during this runbook

1. Which accounting sync passes 1.2 — ERP Integrations or Dashi?
2. Does AReceivables include statements and reminders below Enterprise?
3. Does AUD display on Grow (1.1)?
4. Net 30, or 20th of the month following?
5. What trade percentage, and what bulk bands?
6. Does any live page use `templates/page.wholesale-partner.json`?

---

## What comes next

**Phase 2** — the storefront work that makes this good rather than merely
functional: the ColorFill order grid, Colour Matcher → cart, a trade entry point,
contextual GST. See spec section 9 and
`docs/superpowers/plans/2026-09-08-colorfill-ordering-and-colour-matcher.md`.
