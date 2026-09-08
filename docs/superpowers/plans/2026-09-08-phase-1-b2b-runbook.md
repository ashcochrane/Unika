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

## Stage 2 — Customer accounts migration ⚠️

**The only step in this project that affects existing customers.** Do it on a quiet
weekday morning, not a Friday.

### What actually changes for customers

| Before (legacy)  | After (modern)                                 |
| ---------------- | ---------------------------------------------- |
| Email + password | **One-time 6-digit code emailed each sign-in** |
| —                | No password exists at all                      |

Existing passwords stop mattering entirely. Customers who try their saved password
will be confused. **This needs an email before, not after.**

### Why it is not optional

Legacy customer accounts are **deprecated** — unavailable to new stores, receiving
no further updates, with a sunset date to be announced during 2026. You are
choosing when, not whether. Doing it deliberately inside a 30-day rollback window
is strictly better than being forced later.

### Steps

- [ ] **Send the customer email first.** Explain: no more password, a 6-digit code
      arrives by email, here is where to sign in. Do this a few days ahead.
- [ ] Settings → **Customer accounts** → upgrade to customer accounts
- [ ] Sign in yourself as a test customer end to end
- [ ] Place a test retail order as that customer
- [ ] Confirm order history still shows historical orders
- [ ] Watch the support inbox for **48 hours**

### Rollback

**You can revert within 30 days.** After that the door closes.

If logins break in a way you cannot resolve: Settings → Customer accounts →
revert. B2B is unusable on legacy, so reverting also means pausing Phase 1 —
that is the correct trade, customers come first.

- [ ] **Do not delete `templates/customers/*` or `sections/main-account.liquid`
      until 30 days have passed without incident.** They are dead code but they
      are also the rollback path.
- [ ] Rebuild any Flow workflows identified in 1.4.

---

## Stage 3 — B2B configuration

Additive and low risk. Nothing here is customer-visible until you attach a real
customer to a company in Stage 5.

### 3.1 Enable B2B

- [ ] Confirm **Customers → Companies** now appears in the admin

### 3.2 Market and catalog

- [ ] Create a **B2B market** for New Zealand
- [ ] Create the **NZ Trade catalog** — this is **catalog 1 of 3**
- [ ] Set trade pricing as a **percentage adjustment** against base prices

> The trade percentage is a business decision, entered here, changeable any time
> by staff without a developer. It does not need to be final to proceed.

- [ ] **Reserve catalog 2 for AU. Never spend catalog 3.** The cap is 3 across all
      B2B markets on this plan.

### 3.3 Payment terms

- [ ] Set terms on the company location — **Net 30**, or the 20th of the month
      following, per NZ convention
- [ ] Configure **payment reminders** — up to 5, at the due date and after

### 3.4 🔴 Lock payment methods to bank transfer

**Do this before any trade customer can reach a "Pay now" button.**

Buyers can pay outstanding orders themselves from customer accounts. That button
offers whatever payment methods are enabled. A card payment costs **2.45% +
$0.30** — precisely the margin the bank-transfer strategy exists to protect.

- [ ] Restrict B2B company-location payment methods to **bank transfer / manual**
- [ ] Verify by opening an unpaid test order as the customer — confirm card is
      **not** offered
- [ ] Only once verified, note that **PayRules can be uninstalled** (Stage 5)

### 3.5 Quantity rules

- [ ] Set **increment 9** on ColorFill tubes (sold in 9-packs)
- [ ] Set minimums per variant where required

### 3.6 Bulk discount bands

Volume price breaks are **per variant and do not combine across variants**, so a
cart of eight different ColorFill colours would earn nothing from them.

- [ ] Create **order-level automatic discounts**, scoped to the **B2B market** so
      they never reach retail customers
- [ ] Set bands on cart subtotal — e.g. $1,000 → 5%, $2,500 → 10%. Values are a
      commercial decision; the mechanism does not depend on them.
- [ ] Use volume price breaks **only** on single-SKU-depth products — MitreBond
      cartons, TopSeal, cleaners, bolts. **Never on ColorFill colours.**

### 3.7 Trade application flow

- [ ] Build an application form with **Shopify Forms** (installed, free) —
      business name, GST number, contact, trade references
- [ ] Add a **tax registration metafield** on company for the GST number / ABN.
      Cheap now, ugly to retrofit when AU arrives.
- [ ] Use **Flow** to notify staff on submission

---

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
