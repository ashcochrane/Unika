# MYOB sync configuration — captured from MySync before removal

Recorded 2026-09-08 from the outgoing **MySync** app (`app.mysync.io`), so the
replacement can be configured identically. Susan will need this.

## Connection

| Setting | Value |
| --- | --- |
| Shopify account | `unika-nz` |
| MYOB account | `Unika` |
| **Company file** | **Beauty Craft Surfaces Limited** |

## Tax codes

| Setting | Value |
| --- | --- |
| Taxed order line tax code | **`S15`** (NZ GST 15%) |
| Tax free order line tax code | **`Z`** |
| Taxed freight tax code | *(empty)* |
| Tax free freight tax code | *(empty)* |

Freight tax codes being blank is worth questioning with Susan — freight is
normally GST-taxable in NZ, so this may have been under-taxing shipping.

## Orders

| Setting | Value |
| --- | --- |
| Create MYOB quotes | Off |
| Create MYOB orders | Off |
| **Create MYOB invoices** | **On** |
| Invoice fulfillment status filter | **Any status** |
| Invoice financial status filter | **Any status** |

**"Any status" on the financial filter is the important one.** It means invoices
were created regardless of whether the order was paid — which is exactly the
behaviour B2B net terms requires. Whatever replaces this must do the same, or
unpaid Net 45 orders will not reach MYOB until they are paid.

## Payments

| Setting | Value |
| --- | --- |
| Create payments | On |
| **Default payment account** | **ANZ Cheque Account (1-0100)** |
| Shopify payment status filter | **Success** |
| Multicurrency payments — currency | *(empty)* |
| Multicurrency payments — use order total | Off |
| Payment method mapping | *(none configured)* |

Multicurrency being empty matters for Australia later — see the AU section of the
spec.

## Products

All product syncing was **off** (several options are Pro-plan gated):

- Create products in MYOB — off
- Asset / cost of sales / income / expense accounts — all empty
- Create MYOB products in store — off
- Set to active — off
- Track inventory — off

So MYOB held no product records from Shopify. Inventory was not synced.

## ⚠️ Sync gap

Orders `UK-1083` (25 Aug 2026) and `UK-1084` (26 Aug 2026) show **no MYOB export
badge**; every older order does. Orders placed after 26 Aug are also missing.

**Roughly two weeks of orders are not in MYOB.** They must be backfilled by the
replacement app, entered manually, or recovered by briefly reconnecting MySync
before it is removed.

## Why it stopped

The app displayed: *"Action required: Following MYOB's API update, reconnect your
MYOB account and select the new connection in Settings to keep your sync running
after Sep 1."*

**The integration was not abandoned — a required reconnection was never
actioned.** Public reviews of the app in 2026 do report unanswered support and
silent failures, but that is not what happened here.

## Customers

| Setting | Value |
| --- | --- |
| Create missing customer cards for new orders | On |

That was the entire tab. No matching or de-duplication rules, and no way to
direct a B2B order to a company card rather than an individual's card.

## Returns

| Setting | Value |
| --- | --- |
| Returns (Pro plan) | **Off** |

**Refunds and credit notes never reached MYOB.** Every refund since the
integration was set up exists in Shopify only.

## Inventory

| Setting | Value |
| --- | --- |
| Sync inventory from MYOB | Off |
| MYOB quantity type / Shopify location | *(both empty)* |
| Use multiple locations (Pro plan) | Off |

Not a problem — Shopify is the source of truth for stock. Worth keeping off.

## Schedule

Frequency was never selected. A single hourly slot at `:00` was configured.

