# Target MYOB sync configuration

For the replacement app (**Dashi**), and as the agenda for the call with Susan.

The outgoing setup is recorded in `myob-sync-configuration.md`. It worked, but it
was minimal, and it predates B2B. Three things it did not do now matter.

---

## The three settings that decide whether this works

### 1. Create invoices regardless of payment status

**Non-negotiable.** B2B orders on Net 45 are unpaid for six weeks. A sync that
only invoices on payment leaves that revenue unrecognised and gives no debtor
ledger — which is the entire reason for doing this.

The old app achieved it with *invoice financial status filter → any status*.
The replacement must do the same.

### 2. Create payments only when payment actually succeeds

The old app filtered payments to *success*, which is correct. An unpaid order must
produce an **open invoice and no payment**, so the invoice sits in debtors until
the bank transfer arrives.

Getting 1 and 2 the wrong way round produces either missing revenue or phantom
payments. Both are worse than no sync.

### 3. B2B orders must reach the **company** card, not the buyer's

This is the new requirement and the one no app documents.

When `Ash Test Company` orders through `ashtoncochrane96@gmail.com`, MYOB must
show the invoice against **Ash Test Company**. If it lands against "Ashton
Cochrane", the debtor ledger is per-person rather than per-business, statements
are wrong, and reconciliation breaks.

Shopify itself warns about this on non-Plus plans: *"Some apps may not attribute
B2B orders correctly on your current plan. Check that B2B orders are assigned to a
company, not just an individual customer."*

**Test this explicitly before trusting the sync.**

---

## Fix what the old setup got wrong

| Area | Old | Target |
| --- | --- | --- |
| **Freight tax codes** | Both blank | Set. Freight is GST-taxable in NZ, so shipping was likely going in untaxed — ask Susan to check historically, not just going forward |
| **Returns / credit notes** | Off | **On.** A credit note against an open invoice is how a trade bill gets corrected before payment |
| **Schedule** | Frequency unset | Set deliberately. Hourly is fine; the point is that it is chosen |
| **Customer cards** | Auto-create, no rules | Needs a company-aware strategy — see above |

Keep off: product sync, inventory sync. Shopify is the source of truth for both.

---

## Carry across unchanged

| Setting | Value |
| --- | --- |
| Company file | Beauty Craft Surfaces Limited |
| Taxed order line tax code | `S15` |
| Tax free order line tax code | `Z` |
| Default payment account | ANZ Cheque Account (1-0100) |

---

## Questions for Susan

1. **Freight tax code** — which code should shipping use, and does the historical
   under-taxing need correcting?
2. **Trade customer cards** — one MYOB card per company, or per buyer? This
   determines whether statements work.
3. **The backlog** — orders from roughly 25 August are not in MYOB. Backfill
   through the new app, enter manually, or briefly reconnect the old one?
4. **Reconciliation** — when a trade customer pays one bank transfer covering
   several invoices, how should that be applied in MYOB?
5. **Credit notes** — should refunds create credit notes automatically, or be
   raised by hand?
6. **Multi-currency** — does the current MYOB plan support it, or would Australia
   need AccountRight Premier? This shapes whether AU can share this company file
   or needs its own, and therefore whether AU needs its own Shopify store.

---

## Acceptance test before going live

Use `Ash Test Company`, which is already configured with Net 45.

1. Place an order as the trade customer, **leave it unpaid**
2. In MYOB, confirm:
   - An **open invoice** exists, not a journal or summary
   - It is against **Ash Test Company**, not the individual buyer
   - Due date is **45 days out**
   - Line prices are **trade**, not retail
   - **Freight is taxed** at the agreed code
   - **No payment** has been recorded
3. Mark the order paid in Shopify
4. Confirm a **payment appears against that invoice** and it closes

**If step 2 fails on the company attribution, stop.** Everything downstream —
statements, chasing, reconciliation — depends on it.
