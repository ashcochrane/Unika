# ColorFill Ordering & Colour Matcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 23-option ColorFill dropdown with a bulk variant grid, and turn the Colour Matcher from a dead-end lookup table into an ordering surface.

**Architecture:** Pure Shopify theme work in this repo. Dawn's existing but unused `quick-order-list` section is enabled on the ColorFill product template. A new Liquid snippet emits a JSON map from SKU code (`71100961-CB402` → `CB402`) to variant id; a small vanilla-JS module reads it and posts to `/cart/add.js` from buttons added to the Colour Matcher table. No B2B dependency — this works for retail customers today and for trade customers after Phase 1.

**Tech Stack:** Liquid · vanilla JS (no framework, no build step) · Shopify CLI · Shopify Cart AJAX API

**Spec:** `docs/superpowers/specs/2026-09-08-unika-trade-portal-design.md` (sections 9 and 10, Phase 2)

## Global Constraints

- **`main` is production.** Never commit to `main`. All work on `feature/trade-portal`. Preview via `npm run push:dev` against an unpublished theme.
- **`git pull` before starting.** Shopify pushes to `main` as `shopify[bot]`; a stale clone reverts live content.
- **No Tailwind, no build step.** Follow Dawn: `{% style %}` for section-scoped CSS, `assets/*.css` for shared.
- **Always honour `color_scheme`.** 37 of 57 sections render `color-{{ section.settings.color_scheme }}`. Never hardcode colour.
- **Never format Shopify-owned files.** `templates/`, `config/`, `locales/`, `sections/*.json` are in `.prettierignore`. Editing a JSON template by hand is fine; running Prettier over it is not.
- **`money_with_currency`, never a literal `$`.** AU readiness.
- **`{% render %}`, never `{% include %}`.**
- **Run `npm run lint` before every commit.** Must report 0 errors.
- **Colour Matcher pagination is `by 300` deliberately** — 299 laminates exist and DataTables searches only what Liquid rendered. Do not "fix" it to 250.

### Verified data facts

- ColorFill: **22 variants, all on the single product handle `colorfill-box`**. SKU shape `71100961-CB402`; the code is `split: '-'` index **1**. Codes are unique.
- TopSeal: 27 variants across multiple `topseal-cartridge-*` products. SKU shape `71105117-TS290110-1` — index 1 is the code, index 2 is pack size, so **two variants share each code**. Out of scope for this plan; see Task 6.
- Colour Matcher metaobject fields: `range.value` (manufacturer), `name.value` (sheet name), `reference.value` → `{colorfill_code, colorfill_hex, colorfill_in_stock, topseal_code, topseal_hex, topseal_in_stock}`.
- `snippets/quick-order-list.liquid` has **no B2B gating** — it renders for any customer.

---

## Testing approach — read this first

Shopify themes have no unit test runner. Do not invent one. The verification cycle for every task is:

1. `npm run lint` → 0 errors
2. `npm run push:dev` → pushes to the unpublished dev theme
3. `curl` the preview URL and assert on the rendered markup

Preview URLs take the form:

```
https://unika.co.nz/<path>?preview_theme_id=<DEV_THEME_ID>
```

Export the id once per session so the commands below work verbatim:

```bash
export DEV_THEME_ID=<id from Task 0>
```

A test "fails" when the `grep` finds nothing (exit 1) and "passes" when it finds the expected markup (exit 0). That is a real, runnable assertion — treat it exactly as you would a unit test.

---

## File Structure

| File                                   | Responsibility                                 |
| -------------------------------------- | ---------------------------------------------- |
| `templates/product.colorfill.json`     | Modify — add the quick-order-list section      |
| `snippets/variant-code-map.liquid`     | Create — emit `{code: variant}` JSON from SKUs |
| `sections/metaobject-datatable.liquid` | Modify — add Add-to-cart column, embed the map |
| `assets/colour-matcher-cart.js`        | Create — resolve code → variant, post to cart  |
| `assets/colour-matcher-cart.css`       | Create — button and feedback styling           |

---

## Task 0: Establish the dev theme

**Files:** Modify `shopify.theme.toml`

- [ ] **Step 1: List themes and decide the target**

```bash
shopify theme list --store unika-nz.myshopify.com
```

An unpublished theme `Copy of Unika/main` (id `130931064929`) exists. **Confirm with Ash whether it is a backup before overwriting it.** If it is, create a dedicated one instead:

```bash
shopify theme push --unpublished --theme "Dev - trade portal" --store unika-nz.myshopify.com
```

- [ ] **Step 2: Record the id**

Edit `shopify.theme.toml`, uncommenting and setting the line under `[environments.development]`:

```toml
theme = "130931064929"
```

- [ ] **Step 3: Verify push targets the dev theme, not live**

```bash
npm run push:dev
```

Expected: output names the **unpublished** theme. If it says `[live]`, stop immediately.

- [ ] **Step 4: Verify the preview URL renders**

```bash
export DEV_THEME_ID=130931064929
curl -sL "https://unika.co.nz/?preview_theme_id=$DEV_THEME_ID" | grep -c "Unika"
```

Expected: a non-zero count.

- [ ] **Step 5: Commit**

```bash
git add shopify.theme.toml
git commit -m "chore: point development environment at the dev theme"
```

---

## Task 1: Enable the ColorFill bulk order grid

Replaces the 23-option dropdown with Dawn's variant matrix. Highest-value change in the plan and almost entirely configuration.

**Files:** Modify `templates/product.colorfill.json`

**Interfaces:**

- Consumes: `sections/quick-order-list.liquid` (exists, unused), `snippets/quick-order-list.liquid` (exists)
- Produces: nothing consumed by later tasks

- [ ] **Step 1: Write the failing test**

The grid is absent today. Confirm that:

```bash
curl -sL "https://unika.co.nz/products/colorfill-box?preview_theme_id=$DEV_THEME_ID" \
  | grep -c "quick-order-list__table"
```

Expected now: `0`.

- [ ] **Step 2: Add the section to the template**

In `templates/product.colorfill.json`, add a sibling of `"main"` inside `"sections"`:

```json
    "quick_order_list": {
      "type": "quick-order-list",
      "settings": {
        "show_image": true,
        "show_sku": true,
        "color_scheme": "scheme-1",
        "padding_top": 36,
        "padding_bottom": 36
      }
    },
```

Then add it to the `"order"` array, immediately after `"main"`:

```json
  "order": ["main", "quick_order_list", "multicolumn", "related-products"]
```

Leave the `variant_picker`, `quantity_selector` and `buy_buttons` blocks in `main` untouched for now — removing them is Task 5, after the grid is confirmed working. Do not run Prettier on this file.

- [ ] **Step 3: Lint and push**

```bash
npm run lint && npm run push:dev
```

Expected: 0 theme-check errors; push succeeds.

- [ ] **Step 4: Run the test to verify it passes**

```bash
curl -sL "https://unika.co.nz/products/colorfill-box?preview_theme_id=$DEV_THEME_ID" \
  | grep -c "quick-order-list__table"
```

Expected: `1` or more.

Also confirm all 22 variants render as rows. **The row class is `variant-item`,
not `quick-order-list__row`** — verified against the rendered page:

```bash
./scripts/preview.sh /products/colorfill-box | grep -oc 'class="variant-item"'
```

Expected: `22`.

- [ ] **Step 5: Commit**

```bash
git add templates/product.colorfill.json
git commit -m "feat: enable bulk variant grid on ColorFill product template"
```

---

## Task 2: SKU code → variant JSON map

The Colour Matcher stores `colorfill_code` (e.g. `CB402`) but has no link to a product. Variant SKUs carry the code at `split: '-'` index 1, so the map is built from SKUs.

**Files:** Create `snippets/variant-code-map.liquid`

**Interfaces:**

- Consumes: `all_products[handle]` (Liquid global, lookup by handle)
- Produces: a bare JSON object literal, no surrounding tag. Shape:
  `{"CB402": {"id": 42000453763169, "available": true, "price": 1710, "title": "Black-CB402"}, ...}`
  Consumed by Task 3 (embeds it) and Task 4 (reads it).

- [ ] **Step 1: Write the failing test**

The snippet does not exist yet:

```bash
test -f snippets/variant-code-map.liquid && echo EXISTS || echo MISSING
```

Expected now: `MISSING`.

- [ ] **Step 2: Create the snippet**

```liquid
{% comment %}
  Emits a JSON object mapping a SKU's code segment to its variant.

  Variant SKUs are shaped "<internal>-<code>[-<packsize>]", e.g.
  "71100961-CB402" or "71105117-TS290110-1". The code is index 1 after
  splitting on "-". Codes are unique within ColorFill; TopSeal has two
  variants per code (pack sizes), so only the last one wins — do not use
  this for TopSeal without handling pack size first.

  Accepts:
  - product_handles: {String} comma-separated product handles

  Usage:
  {% render 'variant-code-map', product_handles: 'colorfill-box' %}
{% endcomment %}

{%- liquid
  assign handles = product_handles | split: ','
  assign is_first = true
-%}
{
{%- for handle in handles -%}
  {%- assign target_product = all_products[handle | strip] -%}
  {%- for variant in target_product.variants -%}
    {%- assign sku_parts = variant.sku | split: '-' -%}
    {%- if sku_parts.size > 1 -%}
      {%- assign code = sku_parts[1] | strip | upcase -%}
      {%- unless is_first %},{% endunless -%}
      {{ code | json }}:{"id":{{ variant.id }},"available":{{ variant.available }},"price":{{ variant.price }},"title":
      {{- variant.title | json -}}
      }
      {%- assign is_first = false -%}
    {%- endif -%}
  {%- endfor -%}
{%- endfor -%}
}
```

- [ ] **Step 3: Verify it produces valid JSON**

Temporarily render it on a page you can fetch. Add to the very top of `sections/metaobject-datatable.liquid`, before the `{% comment %}` block:

```liquid
<script id='TempMapProbe' type='application/json'>
  {% render 'variant-code-map', product_handles: 'colorfill-box' %}
</script>
```

Then:

```bash
npm run lint && npm run push:dev
curl -sL "https://unika.co.nz/pages/colour-matcher?preview_theme_id=$DEV_THEME_ID" \
  | python3 -c "
import sys,re,json
h=sys.stdin.read()
m=re.search(r'<script id=\"TempMapProbe\" type=\"application/json\">(.*?)</script>', h, re.S)
d=json.loads(m.group(1))
print('codes:', len(d))
print('CB402 present:', 'CB402' in d)
print('sample:', json.dumps(d.get('CB402')))
"
```

Expected: `codes: 22`, `CB402 present: True`, and a sample object with a numeric `id`.

- [ ] **Step 4: Remove the probe**

Delete the `TempMapProbe` script line you added in Step 3. It exists only to prove the snippet works.

- [ ] **Step 5: Commit**

```bash
npm run lint
git add snippets/variant-code-map.liquid
git commit -m "feat: add SKU code to variant JSON map snippet"
```

---

## Task 3: Build the cart assets

**Files:** Create `assets/colour-matcher-cart.js`, create `assets/colour-matcher-cart.css`

**Interfaces:**

- Consumes: nothing — these files stand alone until Task 4 wires them in
- Produces: `assets/colour-matcher-cart.js` and `assets/colour-matcher-cart.css`.
  The JS expects, and Task 4 must supply verbatim: a `<script
id="ColourMatcherVariants" type="application/json">` holding the map, and
  `button.colour-matcher-add[data-code="<CODE>"]` per row.

**Why this comes before the section edit:** a section referencing
`{{ 'colour-matcher-cart.js' | asset_url }}` before the file exists pushes a
broken asset URL. Create the assets first.

- [ ] **Step 1: Write the failing test**

```bash
test -f assets/colour-matcher-cart.js && echo EXISTS || echo MISSING
```

Expected now: `MISSING`.

- [ ] **Step 2: Create the JS**

```javascript
/**
 * Colour Matcher — add matched ColorFill products to the cart.
 *
 * Reads a { code: {id, available, price, title} } map rendered by Liquid
 * (snippets/variant-code-map.liquid) and posts to the Cart AJAX API when a
 * row's Add button is clicked. Event delegation is used because DataTables
 * re-renders rows on paging, search and sort, which destroys direct listeners.
 */
(function () {
  'use strict';

  const mapEl = document.getElementById('ColourMatcherVariants');
  if (!mapEl) return;

  let variants;
  try {
    variants = JSON.parse(mapEl.textContent);
  } catch (e) {
    console.error('[colour-matcher] variant map is not valid JSON', e);
    return;
  }

  const RESET_DELAY = 2000;

  function setState(button, text, state) {
    button.textContent = text;
    button.dataset.state = state || '';
  }

  function addToCart(button) {
    const code = button.dataset.code;
    const variant = variants[code];

    if (!variant) {
      setState(button, 'Unavailable', 'error');
      return;
    }
    if (!variant.available) {
      setState(button, 'Out of stock', 'error');
      return;
    }

    button.disabled = true;
    setState(button, 'Adding…', 'busy');

    fetch(window.Shopify.routes.root + 'cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ items: [{ id: variant.id, quantity: 1 }] }),
    })
      .then(function (response) {
        if (!response.ok) throw new Error('cart/add returned ' + response.status);
        return response.json();
      })
      .then(function () {
        setState(button, 'Added ✓', 'success');
        document.dispatchEvent(new CustomEvent('colour-matcher:added', { detail: { code: code } }));
      })
      .catch(function (error) {
        console.error('[colour-matcher] add to cart failed', error);
        setState(button, 'Try again', 'error');
      })
      .finally(function () {
        window.setTimeout(function () {
          button.disabled = false;
          setState(button, 'Add', '');
        }, RESET_DELAY);
      });
  }

  document.addEventListener('click', function (event) {
    const button = event.target.closest('.colour-matcher-add');
    if (button) addToCart(button);
  });
})();
```

- [ ] **Step 3: Create the CSS**

Uses Dawn's custom properties so the colour scheme is respected. No literal colours.

```css
.colour-matcher-order-col {
  white-space: nowrap;
  text-align: center;
}

.colour-matcher-add {
  font: inherit;
  font-size: 1.3rem;
  padding: 0.4rem 1.2rem;
  cursor: pointer;
  border: 0.1rem solid rgba(var(--color-foreground), 0.3);
  border-radius: var(--buttons-radius, 0.4rem);
  background-color: rgb(var(--color-background));
  color: rgb(var(--color-foreground));
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;
}

.colour-matcher-add:hover:not(:disabled) {
  border-color: rgba(var(--color-foreground), 0.7);
}

.colour-matcher-add:disabled {
  cursor: default;
  opacity: 0.8;
}

.colour-matcher-add[data-state='success'] {
  border-color: rgba(var(--color-foreground), 0.7);
  font-weight: 600;
}

.colour-matcher-add[data-state='error'] {
  opacity: 0.6;
}
```

- [ ] **Step 4: Lint**

```bash
npm run lint
```

Expected: 0 errors. Prettier formats both files on commit via lint-staged.

- [ ] **Step 5: Verify the JS parses**

```bash
node --check assets/colour-matcher-cart.js && echo "JS OK"
```

Expected: `JS OK`. Nothing is wired up yet — behaviour is verified in Task 4.

- [ ] **Step 6: Commit**

```bash
git add assets/colour-matcher-cart.js assets/colour-matcher-cart.css
git commit -m "feat: add ColorFill products to cart from the Colour Matcher"
```

---

## Task 4: Add an order column to the Colour Matcher

**Files:** Modify `sections/metaobject-datatable.liquid`

**Interfaces:**

- Consumes: `snippets/variant-code-map.liquid` (Task 2), and
  `assets/colour-matcher-cart.{js,css}` (Task 3)
- Produces: `<script id="ColourMatcherVariants" type="application/json">` holding
  the map, and `<button class="colour-matcher-add" data-code="CB402">` per row.
  Task 3's JS matches on these exact names — do not rename either.

- [ ] **Step 1: Write the failing test**

```bash
curl -sL "https://unika.co.nz/pages/colour-matcher?preview_theme_id=$DEV_THEME_ID" \
  | grep -c "colour-matcher-add"
```

Expected now: `0`.

- [ ] **Step 2: Embed the variant map**

In `sections/metaobject-datatable.liquid`, immediately after the `<script src="{{ 'datatables.js' | asset_url }}" defer="defer"></script>` line, add:

```liquid
{{ 'colour-matcher-cart.css' | asset_url | stylesheet_tag }}
<script src='{{ 'colour-matcher-cart.js' | asset_url }}' defer='defer'></script>
<script id='ColourMatcherVariants' type='application/json'>
  {%- render 'variant-code-map', product_handles: 'colorfill-box' -%}
</script>
```

- [ ] **Step 3: Add the header cell**

Find the `<thead>` row. After the `<th>ColorFill Code</th>` line, add:

```liquid
<th class='colour-matcher-order-col'>Order</th>
```

- [ ] **Step 4: Add the body cell**

Inside `{% if metaobject.reference %}`, immediately after the line
`<td>{{ referenced_metaobject.colorfill_code }}</td>`, add:

```liquid
<td class='colour-matcher-order-col'>
  {%- assign cf_code = referenced_metaobject.colorfill_code | strip | upcase -%}
  {%- if cf_code != blank -%}
    <button
      type='button'
      class='colour-matcher-add'
      data-code='{{ cf_code | escape }}'
      aria-label='Add ColorFill {{ cf_code | escape }} to cart'
    >
      Add
    </button>
  {%- endif -%}
</td>
```

Note: the `<th>` count and `<td>` count must match or DataTables throws. There is exactly one new `<th>` and one new `<td>`, both inside the `reference` branch — rows without a `reference` already render fewer cells, which is pre-existing behaviour.

- [ ] **Step 5: Lint and push**

```bash
npm run lint && npm run push:dev
```

Expected: 0 errors.

- [ ] **Step 6: Run the test to verify it passes**

```bash
curl -sL "https://unika.co.nz/pages/colour-matcher?preview_theme_id=$DEV_THEME_ID" \
  | grep -c "colour-matcher-add"
```

Expected: a count in the hundreds (one per laminate row with a reference).

Confirm the map is embedded:

```bash
curl -sL "https://unika.co.nz/pages/colour-matcher?preview_theme_id=$DEV_THEME_ID" \
  | grep -c 'id="ColourMatcherVariants"'
```

Expected: `1`.

- [ ] **Step 7: Verify end to end in a browser**

Markup checks cannot prove a click reaches the cart. Open:

```
https://unika.co.nz/pages/colour-matcher?preview_theme_id=<DEV_THEME_ID>
```

Confirm, in order:

1. An **Add** button appears in each row.
2. Clicking one shows `Adding…`, then `Added ✓`.
3. The header cart count increases.
4. The cart holds the ColorFill variant whose SKU ends in that row's code.
5. **Search for a laminate, then click Add on a filtered row.** This is the case
   that breaks with direct event listeners and the reason Task 3 uses delegation.
6. Page to result set 2 and click Add there too.

- [ ] **Step 8: Commit**

```bash
git add sections/metaobject-datatable.liquid
git commit -m "feat: add order column and variant map to Colour Matcher"
```

---

## Task 5: Retire the ColorFill dropdown

Only after Task 1 is confirmed working. Removing the picker before the grid is proven would leave the product unbuyable.

**Files:** Modify `templates/product.colorfill.json`

- [ ] **Step 1: Confirm the grid works**

```bash
./scripts/preview.sh /products/colorfill-box | grep -oc 'class="variant-item"'
```

Expected: `22`. If not, stop and fix Task 1.

- [ ] **Step 2: Disable the redundant blocks**

In `templates/product.colorfill.json`, add `"disabled": true` to the `variant_picker`, `quantity_selector` and `buy_buttons` blocks. Do not delete them — disabling is reversible from the theme editor, deletion is not.

```json
        "variant_picker": {
          "type": "variant_picker",
          "disabled": true,
          "settings": {
            "picker_type": "button",
            "swatch_shape": "circle"
          }
        },
```

Apply the same `"disabled": true` key to `quantity_selector` and `buy_buttons`.

- [ ] **Step 3: Lint and push**

```bash
npm run lint && npm run push:dev
```

- [ ] **Step 4: Verify the dropdown is gone and the grid remains**

```bash
curl -sL "https://unika.co.nz/products/colorfill-box?preview_theme_id=$DEV_THEME_ID" \
  | grep -c 'variant-picker'
```

Expected: `0`.

```bash
curl -sL "https://unika.co.nz/products/colorfill-box?preview_theme_id=$DEV_THEME_ID" \
  | grep -o 'quick-order-list__row' | wc -l
```

Expected: `22`.

- [ ] **Step 5: Browser check**

Open the preview product page. Confirm a customer can add several colours in one pass and reach checkout. **If anything is unbuyable, revert this task immediately** — Tasks 1–4 stand on their own.

- [ ] **Step 6: Commit**

```bash
git add templates/product.colorfill.json
git commit -m "feat: retire single-variant dropdown on ColorFill in favour of the grid"
```

---

## Task 6: TopSeal — scope note, not an implementation

**Do not implement TopSeal in this plan.** Recorded here so the next person does not rediscover it.

TopSeal SKUs are shaped `71105117-TS290110-1`, where index 2 is a pack size (`1` or `12`). **Two variants share each code**, so `snippets/variant-code-map.liquid` as written keeps only the last one. TopSeal also spans multiple product handles rather than one.

Extending to TopSeal requires, in order:

1. Confirming what format `referenced_metaobject.topseal_code` actually holds — it may or may not match the SKU segment.
2. Deciding the pack-size default, or adding a size choice to the row.
3. Changing the map's value shape from an object to an array of variants per code, and updating Task 3's JS to match.

That is a separate plan.

---

## Self-review notes

**Spec coverage.** This plan implements spec section 9 items 1 and 2 (ColorFill grid, Colour Matcher → cart). Section 9 items 3 and 4 (contextual GST display, trade-aware navigation) are **not** covered — both depend on Phase 1 markets and B2B being live, so they belong to a later plan.

**Deliberately out of scope:** Phase 0 (accounting sync trial), Phase 1 (B2B admin configuration — not code and not branchable), Phase 3 (statement service and portal extension — a separate codebase), Phase 4 (Australia).
