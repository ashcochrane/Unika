# Operations plan

Ordered by dependency and risk. Each phase has a **done when** so it is obvious
whether to move on.

---

## Phase A — Before the call with Susan

*You alone. About an hour. Do A1 today.*

### A1. 🔴 Recover the MYOB backlog — time sensitive

Orders from roughly **25 August** onward never reached MYOB. The gap grows every
day, and **deleting MySync removes the only easy way to recover it**.

1. In MySync, action the banner: reconnect the MYOB account and select the new
   connection in Settings
2. **Run once**
3. In the Orders list, confirm `UK-1083`, `UK-1084` and everything since now show
   the **MYOB** export badge

**Done when:** every order has an export badge, or you have a written list of the
ones that need manual entry.

> If reconnecting fails, stop and note which orders are missing. Manual entry of
> two weeks is unpleasant but recoverable; discovering the gap in six months is
> worse.

### A2. Rename the payment label

Second PayRules rule, same condition as the first (**Company → Customer is
company → If found**), action **Rename**:

- `Choose payment method later` → `Pay on account — invoice due in 45 days`

**Done when:** a trade checkout shows the new label and retail is unchanged.

### A3. Decide the commercial numbers

Neither needs a developer; both are admin fields.

- **Trade rate** — currently a 5% placeholder in the `New Zealand Trade` catalog
- **Bulk discount bands** — e.g. spend $1,000 → 5%, $2,500 → 10%, as order-level
  automatic discounts scoped to the B2B market

**Done when:** you have numbers you would be comfortable telling a customer.

---

## Phase B — The call with Susan

Agenda is in `myob-sync-target-configuration.md`. Six questions; three matter most.

1. **Freight tax code** — and whether the historical under-taxing needs correcting
2. **Trade customer cards** — one MYOB card per company, or per buyer? Statements
   depend on this
3. **Multi-currency** — does the current MYOB plan support it, or would Australia
   need AccountRight Premier? **This decides whether AU can share this company
   file, and therefore whether AU needs its own Shopify store**
4. Backlog — backfill, manual entry, or already handled in A1
5. Reconciliation — one bank transfer covering several invoices
6. Credit notes — automatic or by hand

**Done when:** you have answers to 1, 2 and 3 written down.

---

## Phase C — Replace the sync

*Needs Susan's answers to A/B.*

1. Install **Dashi** (free trial). **Leave MySync installed but stopped** — do not
   delete yet
2. Configure from `myob-sync-target-configuration.md`, including the freight tax
   code Susan specified and **returns switched on**
3. Run the acceptance test in that document against `Ash Test Company`
4. Only once it passes: **delete MySync**, then delete the duplicate
   *"Xero, QuickBooks or MYOB Sync"*

**Done when:** an unpaid Net 45 order appears in MYOB as an open invoice against
the **company**, with taxed freight and no payment — and marking it paid in
Shopify closes it.

> Running two syncs at once double-posts. Stop MySync before starting Dashi.

---

## Phase D — Invoices and statements

1. Install **AReceivables** (free tier to trial)
2. Confirm with the vendor which tiers include **statements** and **reminders** —
   the pricing table does not say
3. Configure invoices at trade pricing with PO numbers
4. Generate a statement for `Ash Test Company` and check it aggregates correctly

**Done when:** you can produce a month-end statement showing what a company owes
across several orders.

---

## Phase E — Take the storefront live

1. Browser-check the ColorFill grid on the dev theme: can you actually add several
   colours and reach checkout?
2. Only if yes, retire the old dropdown (disable `variant_picker`,
   `quantity_selector`, `buy_buttons` on `product.colorfill.json`)
3. Review the trade hub, application page and Colour Matcher ordering on the dev
   theme
4. **Merge `feature/trade-portal` to `main`** — this deploys

**Done when:** the trade pages are live and reachable from the Trade menu item.

> Merging is a deploy. Do it when you can watch the storefront for an hour, not
> at 5pm on a Friday.

---

## Phase F — First real trade customers

1. Set the real trade rate from A3
2. Set the bulk discount bands
3. Invite **two or three friendly customers**, not the whole list
4. Let them run a **full billing cycle** — order, invoice, statement, bank
   transfer, MYOB reconciliation — before inviting anyone else

**Done when:** one real customer has ordered on account and paid, and the money
reconciled in MYOB without manual intervention.

---

## Later — Australia

Blocked on stock in Australia, not on technology. When it comes:

- Susan's multi-currency answer decides one store or two
- Starshipit replaces GoSweetSpot (covers NZ **and** AU, ~$45 AUD/mo)
- AU market + catalog 2, ABN capture, AU GST

The AU currency capability is already proven on the current plan.
