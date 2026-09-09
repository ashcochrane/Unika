# Trade screens audit

**Date:** 2026-09-09
**Scope:** every trade-facing screen currently live on `unika.co.nz`, assessed
against Shopify's own B2B theme guidance and against what mature trade
platforms ship.
**Method:** theme source read in full; live storefront verified by HTTP on
2026-09-09; signed-in B2B states assessed from source (no test B2B account
available). Comparators researched: Shopify native B2B, Shopify's Trade theme,
SparkLayer, BigCommerce's B2B portal guidance.

**Status:** the code-side findings were acted on in `feature/trade-screens-v2`.
See §8 for what shipped and what is left as an admin action.

---

## 1. Verdict

The trade screens that exist are **better designed than most Shopify B2B work**.
The swatch band built from real ColorFill hexes, the specification-list benefit
rows and the single quiet fact line are all deliberate choices that avoid the
default three-identical-cards treatment. The context bar follows shopify.dev's
documented location-picker pattern exactly.

Two things are wrong with the current state, and they are different in kind:

1. **One screen is broken in public.** `/pages/trade-application` — the primary
   call to action on the trade landing page — currently shows a developer
   instruction to any visitor. This is live now.
2. **The set of screens is a trade _front door_, not a trade _platform_.** The
   acquisition path is built. The repeat-purchase path — which is the entire
   reason a joinery shop uses a portal — is not. There is no order pad, no saved
   list, no surfaced reorder, no stock, no product documentation, no statement.

The gap is not design quality. It is that the screens built so far serve the
customer who has not yet bought, and the trade business is made of customers
buying for the fourth time this month.

---

## 2. What is live today

| Screen                    | Where                           | State                                                               |
| ------------------------- | ------------------------------- | ------------------------------------------------------------------- |
| Trade landing, signed out | `/pages/trade`                  | Live and complete. `Trade` is in the main nav.                      |
| Trade hub, signed in      | `/pages/trade` (B2B branch)     | Live. Read-only: company name, unpaid flag, five recent orders.     |
| Trade application         | `/pages/trade-application`      | **Live showing an internal placeholder.** No form.                  |
| Trade context bar         | every page, B2B only            | Live. Company, location switcher, two links.                        |
| Contextual GST note       | product pages and product cards | Live.                                                               |
| ColorFill order grid      | all 23 ColorFill products       | Live, but misapplied — see §4.                                      |
| Colour Matcher + Order    | `/pages/colour-matcher`         | Live. 299 rows, order column present.                               |
| Orders, invoices, profile | `account.unika.co.nz`           | Shopify-hosted. The theme cannot style it.                          |
| `templates/customers/*`   | —                               | Dead code. The store is on modern accounts; these are never served. |

Verified: `/account`, `/account/login` and `/account/orders` all 302 to
`account.unika.co.nz`.

---

## 3. Defects to fix before a trade customer sees this

### 3.1 The application page publishes internal instructions — critical

`templates/page.trade-application.json` declares no blocks, so
`sections/trade-application.liquid` falls to its empty state and renders, live,
to anyone:

> Add the **Shopify Forms** block to this section in the theme editor. Use a
> _company account request_ form so a company, location and customer are created
> automatically on submission.

`/pages/trade` links to this page with its primary button, "Apply for an
account". Every trade acquisition path on the site currently ends here.

The instruction is correct — Shopify's native **company account request** form
is the right mechanism, and it creates the company, location and customer
automatically for approval under Customers → Companies → "Ordering not
approved". It simply has not been done.

Two fixes, both needed:

- Add the Shopify Forms block (removes the placeholder).
- Change the empty state so it never leaks internal copy. An unconfigured
  section should render nothing to a customer, or a plain "Call us on … to open
  an account", and show the developer note only when `request.design_mode`.

### 3.2 ColorFill box offers two competing ways to buy

`templates/product.colorfill.json` has `variant_picker`, `quantity_selector` and
`buy_buttons` all enabled, _and_ the `quick-order-list` section below. On
`/products/colorfill-box` (22 colour variants) a buyer sees a 22-option colour
picker with Add to cart, then a 22-row grid with its own quantities and its own
add. Task 5 of the ColorFill plan — "Retire the ColorFill dropdown" — was never
completed.

### 3.3 The grid renders as a one-row table on 22 products

The catalogue is not what the spec assumed. There is one `colorfill-box` product
with 22 colour variants, and **22 separate single-variant `colorfill-tube-*`
products**. The same template drives all of them, so each tube page gets a
one-row order grid headed "Your cart", duplicating the buy button directly above
it and showing `$0.00`.

Consequence worth stating plainly: **the assorted-colour ordering problem is not
solved for tubes.** A fabricator restocking eight tube colours still runs eight
product pages. The grid only helps on the one box product. This is the case for
a catalogue-wide order pad (§5.1), not for more per-product grids.

### 3.4 Duplicate products are live

`colorfill-tube-white-grey-marble-copy` and `colorfill-tube-grey-vellum-copy`
are both published and returned by `/products.json`. `colorfill-tube-grey-vellum`
also exists separately. Duplicates in a trade catalogue cause wrong orders.

### 3.5 Five theme-editor settings do nothing

Merchant-facing controls that produce no output:

- `trade-hub`: `signed_in_heading`, `signed_in_note` — the signed-in branch
  hardcodes the company name and "Account pricing applied at checkout".
- `trade-application`: `submit_label`, `reassurance`, `success_message` — the
  section delegates to an app block, which renders its own.

Either wire them up or remove them. A control that lies is worse than no
control.

### 3.6 Dead CSS for a form that will never render

`assets/trade.css` carries roughly 80 lines styling `.trade-apply__group`,
`__fields`, `__submit`, `__errors`, `__result` — a grouped credit-application
layout, described in the file's own comment. No Liquid renders any of it, and
Shopify Forms will emit its own markup, so it never will. Delete it, or accept
that the intended application design is not the one that ships.

### 3.7 The unpaid-order count is bounded at 50

`sections/trade-hub.liquid` wraps the count in `{% paginate customer.orders by 50 %}`,
so `customer.orders` inside is the first page only. A company past 50 orders will
be told it has fewer unpaid orders than it does. The table shows order value
(`total_net_amount`), not balance owing — honest, but not the number a buyer
wants.

---

## 4. Design and UX assessment, screen by screen

### Trade landing — strong, under-informed

What works, and should be kept:

- The **swatch band from real metaobject hexes** is the right kind of hero: the
  most characteristic thing in this business, rendered as itself rather than as
  a stock photograph. 36 unique colours currently render.
- **`<dl>` specification rows** instead of three identical cards. This is trade
  vernacular and it reads as a catalogue, not a SaaS landing page.
- **One quiet fact line** ("299 laminate sheets matched…") instead of a row of
  stat tiles.

What is missing:

- **The band is inert.** It is the best asset on the page and it is a 12–18px
  decorative stripe with `role="img"`. It should be the door into the Colour
  Matcher.
- **No commercial terms.** The page promises "trade pricing" and "one invoice a
  month" but never says what the terms are (Net 30? 20th of the month
  following?), whether there is a minimum order, what freight costs a trade
  account, or how long approval takes. A fabricator deciding whether to switch
  supplier needs exactly those four numbers. Note the reassurance copy that
  would answer the last one — "We usually reply within one working day" — is one
  of the dead settings in §3.5.
- **No proof.** No years in the trade, no scale, no named trade customers. Trade
  buyers are being asked to change supplier.
- Worth eyeballing between 750px and 990px: the heading is
  `clamp(3.4rem, 7vw, 6.8rem)` and drops to a single column there, so at ~900px
  it renders near 63px above 17px body copy. It may be correct; it should be
  looked at rather than assumed.

### Trade hub, signed in — currently weaker than the page it links to

This is the significant design problem. Shopify's hosted account portal already
provides order history, **Buy Again**, per-order **Pay now**, and self-serve
returns. The trade hub offers five read-only rows and a link to that portal. It
is a strictly smaller version of the thing next to it.

For the hub to earn its place it has to do the two things the hosted portal
cannot:

1. **Order fast** — an order pad across the catalogue (§5.1).
2. **Order the same again** — saved lists and a surfaced reorder (§5.2, §5.3).

Its current primary actions are "Match a laminate" and "Shop the range".
Neither is the top trade action. The most common thing a joinery shop does is
buy what it bought last time, and nothing on this screen does that.

Also: the unpaid flag links to the portal root, not to the unpaid order.

### Trade context bar — correct pattern, two portability bugs

Matches shopify.dev's documented location picker: gated on `customer.b2b?`,
shows current company and location, lists other locations via
`url_to_set_as_current` when there is more than one. Good.

- `/pages/trade` is hardcoded, and the link labels are untranslated string
  literals. Both break under a localised URL prefix — which the AU market plan
  in the spec will produce.
- The bar sits between the header and `<main>` with no landmark. Wrapping it in
  `<nav aria-label="Trade account">` makes it findable to screen-reader users.

### Trade application — designed but not shipped

Beyond §3.1: **there is no pending state anywhere.** Someone who applies and is
not yet approved can still create or hold a plain customer account, sign in, and
see retail prices with no explanation of why their trade pricing is absent.
Mature trade platforms treat "applied, awaiting approval" as a first-class
screen state. There is also no confirmation or what-happens-next screen.

### Contextual GST — works, but keyed on the wrong thing

`snippets/price-tax-note.liquid` branches on `customer.b2b?`. CLAUDE.md's own
AU-readiness rule says inc/ex-GST display must be driven by the **market**, not
by a theme constant — and customer type is not the market. Low severity today,
high cost to retrofit once AU exists, which is precisely why the rule is there.

### Store-wide: no SKU and no stock on any product page

No product template in the theme — not one of the thirteen — enables the `sku`
or `inventory` blocks. A trade buyer ordering by code cannot see the code, and
cannot see whether it is in stock, on any product page. The order grid does show
SKU, which is the only place it appears.

---

## 5. What mature trade platforms have that this does not

Assessed against Shopify's native B2B feature set, Shopify's own Trade theme,
SparkLayer's buyer-facing feature list, and BigCommerce's B2B portal guidance.
Ordered by value to a joinery shop restocking.

| #   | Capability                          | Who ships it                          | Unika today                                  | Verdict                                 |
| --- | ----------------------------------- | ------------------------------------- | -------------------------------------------- | --------------------------------------- |
| 1   | Order pad — add by SKU across range | SparkLayer, BigCommerce, Trade theme  | Per-product grid only                        | **Missing — P1**                        |
| 2   | Saved lists / order templates       | SparkLayer ("Regular Buys")           | None                                         | **Missing — P1**                        |
| 3   | Reorder / Buy Again                 | Shopify native, hosted accounts       | Exists, unsurfaced in the theme              | **Surface — P1**                        |
| 4   | Product docs / SDS on the product   | Universal in consumables distribution | One global Technical Documents page          | **Missing — P1**                        |
| 5   | Stock availability and lead time    | SparkLayer, BigCommerce               | Dawn supports it; no template enables it     | **Missing — P1**                        |
| 6   | Invoice PDF download                | Sufio, AReceivables (not native)      | Phase 3, planned                             | Missing — P2                            |
| 7   | Monthly statement                   | AReceivables, PT2 (not native)        | Phase 3, planned                             | Missing — P2                            |
| 8   | Aggregate balance owing             | SparkLayer; not native (per-order)    | None                                         | Missing — P2                            |
| 9   | Quote / RFQ for a job               | SparkLayer quoting engine             | Draft orders exist merchant-side only        | Missing — P2                            |
| 10  | Applied-but-pending state           | Standard                              | None                                         | Missing — P2                            |
| 11  | Add a colleague                     | Plus-only app                         | Staff add users in admin                     | Known limit — P3                        |
| 12  | Order tracking link                 | Native + GoSweetSpot                  | Status text only, no tracking link           | Weak — P3                               |
| 13  | Self-serve returns                  | Shopify native                        | Exists, unsurfaced                           | Surface — P3                            |
| 14  | Multiple ship-to / job-site address | Shopify native one-time addresses     | Not surfaced or explained                    | Verify — P3                             |
| 15  | PO number at checkout               | Shopify native                        | Trade page promises it; verify it is enabled | Verify — P3                             |
| 16  | Pack-size / increment rules shown   | Shopify native quantity rules         | Verify 9-pack increments are configured      | Verify — P3                             |
| 17  | Trade price against RRP             | Common trade motivator                | None                                         | Consider — P3                           |
| 18  | Sales rep ordering on behalf        | SparkLayer                            | —                                            | Skip at this scale                      |
| 19  | CSV / spreadsheet order upload      | SparkLayer intelligent cart           | —                                            | Skip — 52 SKUs; the order pad covers it |

### 5.1 Order pad — the single highest-value addition

One screen: type or scan a SKU, set a quantity, add. Repeat. Total at the
bottom. Every mature trade platform has this and it is the screen trade buyers
actually live in.

It is also the correct fix for §3.3. The catalogue's shape — 22 single-variant
tube products, 14 single-colour TopSeal products — means per-product grids can
never solve assorted ordering. A catalogue-wide pad solves ColorFill tubes,
TopSeal and everything else at once.

The theme already has most of the parts: `snippets/quick-order-list-row.liquid`,
`assets/quick-order-list.js`, and `snippets/variant-code-map.liquid` which
already maps SKU codes to variants for the Colour Matcher.

### 5.2 Saved lists

"Regular Buys", or a list per job. A joinery shop's orders repeat heavily. This
is the second thing that makes a portal stickier than a phone call. Not native;
would need building, or a small app.

### 5.3 Surface reorder

Free. Shopify's hosted accounts already give every order a **Buy Again**
button — it just lives two clicks deep in a portal the buyer has to navigate to.
Linking each row of the trade hub's order table directly to its order, and
putting "Reorder your last order" as the hub's primary button, costs almost
nothing.

### 5.4 Technical documents on the product

For worktop consumables — adhesives, sealants, cleaners — safety data sheets and
technical datasheets attached to each product are an expectation, not a feature.
There is a `page.technical-documents.json` template and a Resources nav item;
none of it is attached to the products the documents describe.

---

## 6. Recommended order of work

**P0 — before any trade customer is invited in**

1. Add the Shopify Forms company-account-request block to
   `/pages/trade-application`, and make the section's empty state safe for
   customers (§3.1).
2. Disable `variant_picker` / `quantity_selector` / `buy_buttons` on
   `product.colorfill.json`, or drop the grid — one way to buy, not two (§3.2).
3. Stop rendering the grid on single-variant products (§3.3).
4. Unpublish the two `-copy` duplicate products (§3.4).
5. Remove or wire the five dead settings and the dead form CSS (§3.5, §3.6).

**P1 — makes it a trade platform rather than a retail store with trade prices**

6. Catalogue-wide order pad (§5.1).
7. Surface reorder; make the hub's primary action "Reorder" (§5.3).
8. Enable SKU and stock blocks on the product templates (§4).
9. Attach technical documents and SDS to products (§5.4).
10. Saved lists (§5.2).

**P2 — receivables and the long tail**

11. Invoices, statements, aggregate balance — Phase 3 as specced.
12. Applied-but-pending state.
13. Quote request.

**P3 — verify rather than build**

14. PO number, one-time shipping addresses, quantity increments: confirm the
    Phase 1 configuration is actually on, and say so on the trade page.
15. Context bar portability (`/pages/trade` hardcoded, untranslated labels)
    before AU (§4).
16. Move the GST note from `customer.b2b?` to market (§4).

---

## 7. Sources

- [Support B2B customers in your theme — shopify.dev](https://shopify.dev/docs/storefronts/themes/pricing-payments/b2b)
- [Overview of B2B features on Shopify — Shopify Help Center](https://help.shopify.com/en/manual/b2b/getting-started/features)
- [Company account requests — Shopify Help Center](https://help.shopify.com/en/manual/b2b/companies-and-customers/company-account-requests)
- [Sign-in and customer accounts in B2B — Shopify Help Center](https://help.shopify.com/en/manual/b2b/customer-login-and-accounts)
- [Drive repeat orders for B2B — Shopify changelog](https://changelog.shopify.com/posts/drive-repeat-orders-for-b2b)
- [Trade theme — Shopify Theme Store](https://themes.shopify.com/themes/trade/presets/trade)
- [SparkLayer](https://www.sparklayer.io/)
- [B2B customer portal: key features — BigCommerce](https://www.bigcommerce.com/articles/b2b-ecommerce/customer-portal/)
- [8 features to include in your B2B customer portal — B2B Wave](https://www.b2bwave.com/p/8-features-to-include-in-your-b2b-customer-portal)

---

## 8. What shipped on `feature/trade-screens-v2`

Verified against the unpublished dev theme (#130931064929) on 2026-09-09.

| Finding                              | Change                                                                                                |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| §3.1 Application publishes internals | `trade-application` renders a real grouped form; the developer note is now `request.design_mode` only |
| §3.3 One-row grid on 22 products     | `quick-order-list` skips single-variant products                                                      |
| §3.2 Two ways to buy the box         | New `product.colorfill-box.json` drops the duplicate picker; needs the product reassigned             |
| §3.5 Five dead settings              | Application settings now drive the form; hub settings replaced with `pad_*` and `reorder_label`       |
| §3.6 Dead form CSS                   | Now the form's actual styling                                                                         |
| §3.7 Unpaid count bounded at 50      | Exact count only when there is one page; otherwise unquantified, and links to the unpaid order        |
| §4 Band is inert                     | Links to the Colour Matcher                                                                           |
| §4 No commercial terms               | `term` blocks added, shipped empty — fill Payment terms, Minimum order and Freight in the editor      |
| §4 Hub weaker than the portal        | Order pad is the primary action; "open your last order" surfaces reorder in one click                 |
| §4 Context bar portability           | Links resolve via `pages['…'].url`, wrapped in `<nav aria-label>`                                     |
| §4 GST keyed on customer type        | `price-tax-note` reads `cart.taxes_included`, so each market states what Shopify is actually doing    |
| §4 No SKU or stock                   | `sku` and `inventory` blocks added to all 13 product templates                                        |
| §5.1 No order pad                    | `trade-order-pad` section, `/pages/order-pad` template, 103 rows, colour chips from the laminate data |
| §5.2 No saved lists                  | Saved in `localStorage`, guarded so the feature hides where storage is unavailable                    |

### Still admin actions

1. Create a page with the handle `order-pad` using the **Order pad** template.
2. Assign `colorfill-box` to the **colorfill-box** product template.
3. Add the Shopify Forms company-account-request block to the trade application.
4. Unpublish `colorfill-tube-white-grey-marble-copy` and `colorfill-tube-grey-vellum-copy`,
   then trim them from the Colour Matcher's "Orderable product handles" setting.
5. Fill the three trading terms on `/pages/trade`.
6. Switch NZ and AU retail markets to tax-inclusive pricing in Settings → Taxes,
   with the accountant. The theme follows the setting; no further theme change.

### Not addressed

Technical documents and SDS on products (§5.4) need the files or metafields to point at.
Invoices, statements and aggregate balance remain Phase 3 app configuration (§5, items 6–8).
