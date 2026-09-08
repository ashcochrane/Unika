# Trade Screens & Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build every trade-facing storefront screen — trade hub, company location picker, application/onboarding, contextual GST — so the experience is ready before B2B is switched on.

**Architecture:** Pure Liquid in this repo, following Dawn conventions. Trade-only content is gated on `customer.b2b?`; nothing is hidden from retail customers that they should see. No app dependency, no build step.

**Tech Stack:** Liquid · Shopify Forms (installed, free) · Shopify Flow (installed, free)

**Spec:** `docs/superpowers/specs/2026-09-08-unika-trade-portal-design.md` section 9

**Companion plan:** `2026-09-08-colorfill-ordering-and-colour-matcher.md` covers the ordering experience (ColorFill grid, Colour Matcher → cart). This plan covers everything else.

## Global Constraints

- **`main` is production.** Work on `feature/trade-portal`. Preview with `npm run push:dev`.
- **`git pull` first.** Shopify pushes to `main` as `shopify[bot]`.
- **No build step, no Tailwind.** `{% style %}` for section-scoped CSS, `assets/*.css` for shared.
- **Always honour `color_scheme`** — 37 of 57 sections do. Never hardcode colour; use Dawn's CSS custom properties.
- **`money_with_currency`, never a literal `$`.** AU readiness.
- **`{% render %}`, never `{% include %}`.**
- **Never Prettier Shopify-owned files** — `templates/`, `config/`, `locales/`, `sections/*.json` are in `.prettierignore`. Hand-editing JSON templates is fine.
- **`npm run lint` before every commit.** 0 errors required.

### Verified Liquid API

Confirmed against shopify.dev:

| Object                                 | Returns                                          |
| -------------------------------------- | ------------------------------------------------ |
| `customer.b2b?`                        | true for a B2B customer                          |
| `customer.current_company.name`        | the company's name                               |
| `customer.current_location.name`       | the location being purchased for                 |
| `customer.company_available_locations` | locations this buyer can access                  |
| `location.current?`                    | is this the selected location                    |
| `location.url_to_set_as_current`       | link that switches location — **no form needed** |

---

## ⚠️ Testing approach — read before starting

Two categories, tested differently.

**Retail-visible branches** — testable now:

```bash
export DEV_THEME_ID=<your dev theme id>
npm run lint && npm run push:dev
curl -sL "https://unika.co.nz/<path>?preview_theme_id=$DEV_THEME_ID" | grep -c "<marker>"
```

**B2B-gated branches** — `customer.b2b?` is false for everyone until B2B is enabled, so **these cannot be verified yet.** Each such step is marked **[VERIFY AT STAGE 4]**, meaning the end-to-end verification in `2026-09-08-phase-1-b2b-runbook.md` once a test company exists.

Do not fake B2B state to test. Build it, verify the retail branch renders correctly and the B2B branch doesn't leak, and confirm the rest with a real test company later.

---

## File Structure

| File                                      | Responsibility                                   |
| ----------------------------------------- | ------------------------------------------------ |
| `sections/trade-hub.liquid`               | Create — the trade landing content, B2B-aware    |
| `templates/page.trade.json`               | Create — page template using it                  |
| `snippets/company-location-picker.liquid` | Create — location switcher                       |
| `sections/header.liquid`                  | Modify — show company + location picker when B2B |
| `sections/trade-application.liquid`       | Create — the onboarding form                     |
| `templates/page.trade-application.json`   | Create — page template                           |
| `snippets/price-tax-note.liquid`          | Create — contextual GST label                    |
| `assets/trade.css`                        | Create — shared styling                          |

---

## Task 1: Company location picker

Best practice per Shopify: a B2B buyer must be able to choose which company location they're purchasing for, because it drives pricing and delivery. A joinery shop with two workshops cannot order correctly without it.

**Files:** Create `snippets/company-location-picker.liquid`, `assets/trade.css`; Modify `sections/header.liquid`

**Interfaces:**

- Consumes: `customer.b2b?`, `customer.current_company`, `customer.current_location`, `customer.company_available_locations`
- Produces: `snippets/company-location-picker.liquid`, rendered with no arguments. Emits nothing for non-B2B customers.

- [ ] **Step 1: Write the failing test**

Nothing renders it yet:

```bash
test -f snippets/company-location-picker.liquid && echo EXISTS || echo MISSING
```

Expected: `MISSING`.

- [ ] **Step 2: Create the snippet**

```liquid
{% comment %}
  Company location picker for B2B customers.

  A B2B buyer may have access to several company locations. The selected one
  drives catalog pricing and delivery address, so it must be switchable.

  Renders nothing at all for non-B2B customers.

  Usage:
  {% render 'company-location-picker' %}
{% endcomment %}

{%- if customer.b2b? -%}
  <div class='trade-location'>
    <span class='trade-location__company'>{{ customer.current_company.name }}</span>

    {%- if customer.company_available_locations.size > 1 -%}
      <details class='trade-location__details'>
        <summary class='trade-location__summary'>
          {{ customer.current_location.name }}
        </summary>
        <ul class='trade-location__list' role='list'>
          {%- for location in customer.company_available_locations -%}
            {%- unless location.current? -%}
              <li>
                <a class='trade-location__link' href='{{ location.url_to_set_as_current }}'>
                  {{ location.name }}
                </a>
              </li>
            {%- endunless -%}
          {%- endfor -%}
        </ul>
      </details>
    {%- else -%}
      <span class='trade-location__single'>{{ customer.current_location.name }}</span>
    {%- endif -%}
  </div>
{%- endif -%}
```

- [ ] **Step 3: Create the stylesheet**

Dawn custom properties only — no literal colours, so it inherits every colour scheme.

```css
.trade-location {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  font-size: 1.3rem;
  color: rgba(var(--color-foreground), 0.75);
}

.trade-location__company {
  font-weight: 600;
  color: rgb(var(--color-foreground));
}

.trade-location__details {
  position: relative;
}

.trade-location__summary {
  cursor: pointer;
  list-style: none;
  padding: 0.2rem 0.6rem;
  border: 0.1rem solid rgba(var(--color-foreground), 0.2);
  border-radius: 0.4rem;
}

.trade-location__summary::-webkit-details-marker {
  display: none;
}

.trade-location__list {
  position: absolute;
  z-index: 5;
  margin: 0.4rem 0 0;
  padding: 0.4rem 0;
  min-width: 100%;
  list-style: none;
  background-color: rgb(var(--color-background));
  border: 0.1rem solid rgba(var(--color-foreground), 0.2);
  border-radius: 0.4rem;
  box-shadow: 0 0.4rem 1.2rem rgba(var(--color-foreground), 0.12);
}

.trade-location__link {
  display: block;
  padding: 0.6rem 1.2rem;
  color: rgb(var(--color-foreground));
  text-decoration: none;
  white-space: nowrap;
}

.trade-location__link:hover {
  background-color: rgba(var(--color-foreground), 0.06);
}
```

- [ ] **Step 4: Load the stylesheet and render the picker in the header**

In `sections/header.liquid`, find the line rendering the account icon — it contains `routes.account_login_url` around line 263. Immediately **before** the `<div class="header__icons` line, add:

```liquid
{{ 'trade.css' | asset_url | stylesheet_tag }}
{%- render 'company-location-picker' -%}
```

- [ ] **Step 5: Lint and push**

```bash
npm run lint && npm run push:dev
```

Expected: 0 errors.

- [ ] **Step 6: Verify it leaks nothing to retail customers**

This is the part that matters now — a non-B2B visitor must see no trace of it.

```bash
curl -sL "https://unika.co.nz/?preview_theme_id=$DEV_THEME_ID" | grep -c "trade-location"
```

Expected: **`0`**. The snippet renders nothing when `customer.b2b?` is false.

- [ ] **Step 7: [VERIFY AT STAGE 4]** With a test B2B customer signed in, confirm the company name shows, and that a company with two locations can switch between them and sees prices update.

- [ ] **Step 8: Commit**

```bash
git add snippets/company-location-picker.liquid assets/trade.css sections/header.liquid
git commit -m "feat: add company location picker for B2B customers"
```

---

## Task 2: Trade hub page

One page serving three audiences: a logged-out visitor who might become a trade customer, a retail customer, and a signed-in trade customer who wants to get to work.

**Files:** Create `sections/trade-hub.liquid`, `templates/page.trade.json`

**Interfaces:**

- Consumes: `customer.b2b?`, `customer.current_company`, `assets/trade.css` (Task 1)
- Produces: a section of type `trade-hub`, and the page template that mounts it

- [ ] **Step 1: Write the failing test**

```bash
curl -sL "https://unika.co.nz/pages/trade?preview_theme_id=$DEV_THEME_ID" -o /dev/null -w "%{http_code}\n"
```

Expected: `404` — the page does not exist yet.

- [ ] **Step 2: Create the section**

```liquid
{{ 'trade.css' | asset_url | stylesheet_tag }}

{%- style -%}
  .section-{{ section.id }}-padding {
    padding-top: {{ section.settings.padding_top | times: 0.75 | round: 0 }}px;
    padding-bottom: {{ section.settings.padding_bottom | times: 0.75 | round: 0 }}px;
  }

  @media screen and (min-width: 750px) {
    .section-{{ section.id }}-padding {
      padding-top: {{ section.settings.padding_top }}px;
      padding-bottom: {{ section.settings.padding_bottom }}px;
    }
  }
{%- endstyle -%}

<div class='color-{{ section.settings.color_scheme }} gradient'>
  <div class='page-width section-{{ section.id }}-padding'>
    {%- if customer.b2b? -%}
      <div class='trade-hub trade-hub--account'>
        <h1 class='trade-hub__title'>
          {{ section.settings.signed_in_heading -}}
          {%- if customer.current_company.name %}, {{ customer.current_company.name }}{% endif %}
        </h1>

        <ul class='trade-hub__actions' role='list'>
          <li>
            <a class='button' href='{{ routes.account_url }}'>{{ section.settings.orders_label }}</a>
          </li>
          <li>
            <a class='button button--secondary' href='{{ section.settings.matcher_url }}'>
              {{ section.settings.matcher_label }}
            </a>
          </li>
          <li>
            <a class='button button--secondary' href='{{ section.settings.shop_url }}'>
              {{ section.settings.shop_label }}
            </a>
          </li>
        </ul>

        {%- if section.settings.signed_in_note != blank -%}
          <div class='trade-hub__note rte'>{{ section.settings.signed_in_note }}</div>
        {%- endif -%}
      </div>
    {%- else -%}
      <div class='trade-hub trade-hub--marketing'>
        <h1 class='trade-hub__title'>{{ section.settings.heading }}</h1>

        {%- if section.settings.intro != blank -%}
          <div class='trade-hub__intro rte'>{{ section.settings.intro }}</div>
        {%- endif -%}

        {%- if section.blocks.size > 0 -%}
          <ul class='trade-hub__benefits' role='list'>
            {%- for block in section.blocks -%}
              <li class='trade-hub__benefit' {{ block.shopify_attributes }}>
                <h2 class='trade-hub__benefit-title'>{{ block.settings.title }}</h2>
                <div class='rte'>{{ block.settings.text }}</div>
              </li>
            {%- endfor -%}
          </ul>
        {%- endif -%}

        <div class='trade-hub__actions'>
          <a class='button' href='{{ section.settings.apply_url }}'>{{ section.settings.apply_label }}</a>
          <a class='button button--secondary' href='{{ routes.account_login_url }}'>
            {{ section.settings.login_label }}
          </a>
        </div>
      </div>
    {%- endif -%}
  </div>
</div>

{% schema %}
{
  "name": "Trade hub",
  "tag": "section",
  "class": "section",
  "settings": [
    { "type": "header", "content": "Signed-out / retail" },
    { "type": "text", "id": "heading", "label": "Heading", "default": "Trade accounts" },
    { "type": "richtext", "id": "intro", "label": "Intro" },
    { "type": "text", "id": "apply_label", "label": "Apply button", "default": "Apply for an account" },
    { "type": "url", "id": "apply_url", "label": "Apply link" },
    { "type": "text", "id": "login_label", "label": "Log in button", "default": "Log in" },
    { "type": "header", "content": "Signed-in trade customer" },
    { "type": "text", "id": "signed_in_heading", "label": "Heading", "default": "Welcome back" },
    { "type": "richtext", "id": "signed_in_note", "label": "Note" },
    { "type": "text", "id": "orders_label", "label": "Orders button", "default": "Orders & invoices" },
    { "type": "text", "id": "matcher_label", "label": "Matcher button", "default": "Colour Matcher" },
    { "type": "url", "id": "matcher_url", "label": "Matcher link" },
    { "type": "text", "id": "shop_label", "label": "Shop button", "default": "Shop all" },
    { "type": "url", "id": "shop_url", "label": "Shop link" },
    { "type": "header", "content": "Appearance" },
    { "type": "color_scheme", "id": "color_scheme", "label": "Colour scheme", "default": "scheme-1" },
    {
      "type": "range",
      "id": "padding_top",
      "min": 0,
      "max": 100,
      "step": 4,
      "unit": "px",
      "label": "Padding top",
      "default": 40
    },
    {
      "type": "range",
      "id": "padding_bottom",
      "min": 0,
      "max": 100,
      "step": 4,
      "unit": "px",
      "label": "Padding bottom",
      "default": 52
    }
  ],
  "blocks": [
    {
      "type": "benefit",
      "name": "Benefit",
      "settings": [
        { "type": "text", "id": "title", "label": "Title", "default": "Trade pricing" },
        { "type": "richtext", "id": "text", "label": "Text" }
      ]
    }
  ],
  "presets": [{ "name": "Trade hub" }]
}
{% endschema %}
```

- [ ] **Step 3: Create the page template**

`templates/page.trade.json`:

```json
{
  "sections": {
    "main": {
      "type": "trade-hub",
      "blocks": {
        "benefit-1": {
          "type": "benefit",
          "settings": {
            "title": "Trade pricing",
            "text": "<p>Account pricing across the full Unika range, with more off as your order grows.</p>"
          }
        },
        "benefit-2": {
          "type": "benefit",
          "settings": {
            "title": "Buy on account",
            "text": "<p>Order through the month and settle on one invoice.</p>"
          }
        },
        "benefit-3": {
          "type": "benefit",
          "settings": {
            "title": "Order faster",
            "text": "<p>Match a laminate and order every colour you need in one go.</p>"
          }
        }
      },
      "block_order": ["benefit-1", "benefit-2", "benefit-3"],
      "settings": {
        "heading": "Trade accounts",
        "intro": "<p>Unika supplies benchtop fabricators across New Zealand. Open an account for trade pricing, monthly invoicing and faster reordering.</p>",
        "apply_label": "Apply for an account",
        "apply_url": "/pages/trade-application",
        "login_label": "Log in",
        "signed_in_heading": "Welcome back",
        "orders_label": "Orders & invoices",
        "matcher_label": "Colour Matcher",
        "matcher_url": "/pages/colour-matcher",
        "shop_label": "Shop all",
        "shop_url": "/collections/all",
        "color_scheme": "scheme-1",
        "padding_top": 40,
        "padding_bottom": 52
      }
    }
  },
  "order": ["main"]
}
```

- [ ] **Step 4: Add the styles**

Append to `assets/trade.css`:

```css
.trade-hub__title {
  margin-top: 0;
}

.trade-hub__benefits {
  display: grid;
  gap: 2.4rem;
  margin: 3.2rem 0;
  padding: 0;
  list-style: none;
}

@media screen and (min-width: 750px) {
  .trade-hub__benefits {
    grid-template-columns: repeat(3, 1fr);
  }
}

.trade-hub__benefit-title {
  margin: 0 0 0.8rem;
  font-size: 1.8rem;
}

.trade-hub__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1.2rem;
  margin: 2.4rem 0 0;
  padding: 0;
  list-style: none;
}

.trade-hub__note {
  margin-top: 2.4rem;
  color: rgba(var(--color-foreground), 0.75);
}
```

- [ ] **Step 5: Create the page in the admin**

**This is a manual step — templates alone do not create pages.**

Online Store → Pages → Add page. Title `Trade`, handle `trade`, template `page.trade`.

- [ ] **Step 6: Lint, push, verify**

```bash
npm run lint && npm run push:dev
curl -sL "https://unika.co.nz/pages/trade?preview_theme_id=$DEV_THEME_ID" | grep -c "trade-hub--marketing"
```

Expected: `1` — the signed-out branch renders.

```bash
curl -sL "https://unika.co.nz/pages/trade?preview_theme_id=$DEV_THEME_ID" | grep -c "trade-hub--account"
```

Expected: `0` — the B2B branch must not leak.

- [ ] **Step 7: [VERIFY AT STAGE 4]** Signed in as a test B2B customer, confirm the account branch renders with the company name and the three buttons work.

- [ ] **Step 8: Commit**

```bash
git add sections/trade-hub.liquid templates/page.trade.json assets/trade.css
git commit -m "feat: add trade hub page for prospects and signed-in trade customers"
```

---

## Task 3: Trade application (onboarding)

**Files:** Create `sections/trade-application.liquid`, `templates/page.trade-application.json`

**Interfaces:**

- Consumes: Liquid's built-in `contact` form (already used by `sections/contact-form.liquid`)
- Produces: an application form posting to Shopify's contact endpoint

- [ ] **Step 1: Write the failing test**

```bash
curl -sL "https://unika.co.nz/pages/trade-application?preview_theme_id=$DEV_THEME_ID" -o /dev/null -w "%{http_code}\n"
```

Expected: `404`.

- [ ] **Step 2: Create the section**

Uses the `contact` form so submissions land in Shopify admin with no app required. Field names are prefixed `contact[...]` so they appear as attributes on the submission.

```liquid
{{ 'trade.css' | asset_url | stylesheet_tag }}

{%- style -%}
  .section-{{ section.id }}-padding {
    padding-top: {{ section.settings.padding_top | times: 0.75 | round: 0 }}px;
    padding-bottom: {{ section.settings.padding_bottom | times: 0.75 | round: 0 }}px;
  }

  @media screen and (min-width: 750px) {
    .section-{{ section.id }}-padding {
      padding-top: {{ section.settings.padding_top }}px;
      padding-bottom: {{ section.settings.padding_bottom }}px;
    }
  }
{%- endstyle -%}

<div class='color-{{ section.settings.color_scheme }} gradient'>
  <div class='page-width page-width--narrow section-{{ section.id }}-padding'>
    <h1>{{ section.settings.heading }}</h1>

    {%- if section.settings.intro != blank -%}
      <div class='rte'>{{ section.settings.intro }}</div>
    {%- endif -%}

    {%- form 'contact', id: 'TradeApplication', class: 'trade-form' -%}
      {%- if form.posted_successfully? -%}
        <div class='form-status form-status-list form__message' role='status'>
          {{ section.settings.success_message }}
        </div>
      {%- elsif form.errors -%}
        <div class='form__message' role='alert'>
          {{ form.errors | default_errors }}
        </div>
      {%- endif -%}

      <input type='hidden' name='contact[Enquiry type]' value='Trade account application'>

      <div class='trade-form__grid'>
        <div class='field'>
          <input
            class='field__input'
            type='text'
            id='TradeBusiness'
            name='contact[Business name]'
            required
            placeholder=' '
          >
          <label class='field__label' for='TradeBusiness'>Business name</label>
        </div>

        <div class='field'>
          <input class='field__input' type='text' id='TradeGst' name='contact[GST number]' placeholder=' '>
          <label class='field__label' for='TradeGst'>GST number</label>
        </div>

        <div class='field'>
          <input class='field__input' type='text' id='TradeName' name='contact[Contact name]' required placeholder=' '>
          <label class='field__label' for='TradeName'>Your name</label>
        </div>

        <div class='field'>
          <input
            class='field__input'
            type='email'
            id='TradeEmail'
            name='contact[email]'
            required
            spellcheck='false'
            autocapitalize='off'
            autocomplete='email'
            placeholder=' '
          >
          <label class='field__label' for='TradeEmail'>Email</label>
        </div>

        <div class='field'>
          <input
            class='field__input'
            type='tel'
            id='TradePhone'
            name='contact[Phone]'
            autocomplete='tel'
            placeholder=' '
          >
          <label class='field__label' for='TradePhone'>Phone</label>
        </div>

        <div class='field'>
          <input class='field__input' type='text' id='TradeCity' name='contact[City]' placeholder=' '>
          <label class='field__label' for='TradeCity'>City</label>
        </div>
      </div>

      <div class='field'>
        <textarea
          rows='4'
          class='text-area field__input'
          id='TradeNotes'
          name='contact[Notes]'
          placeholder=' '
        ></textarea>
        <label class='form__label field__label' for='TradeNotes'>
          What do you fabricate, and roughly how much do you use?
        </label>
      </div>

      <button type='submit' class='button'>{{ section.settings.submit_label }}</button>
    {%- endform -%}
  </div>
</div>

{% schema %}
{
  "name": "Trade application",
  "tag": "section",
  "class": "section",
  "settings": [
    { "type": "text", "id": "heading", "label": "Heading", "default": "Apply for a trade account" },
    { "type": "richtext", "id": "intro", "label": "Intro" },
    { "type": "text", "id": "submit_label", "label": "Submit button", "default": "Submit application" },
    {
      "type": "text",
      "id": "success_message",
      "label": "Success message",
      "default": "Thanks — we'll be in touch within one business day."
    },
    { "type": "color_scheme", "id": "color_scheme", "label": "Colour scheme", "default": "scheme-1" },
    {
      "type": "range",
      "id": "padding_top",
      "min": 0,
      "max": 100,
      "step": 4,
      "unit": "px",
      "label": "Padding top",
      "default": 40
    },
    {
      "type": "range",
      "id": "padding_bottom",
      "min": 0,
      "max": 100,
      "step": 4,
      "unit": "px",
      "label": "Padding bottom",
      "default": 52
    }
  ],
  "presets": [{ "name": "Trade application" }]
}
{% endschema %}
```

- [ ] **Step 3: Create the page template**

`templates/page.trade-application.json`:

```json
{
  "sections": {
    "main": {
      "type": "trade-application",
      "settings": {
        "heading": "Apply for a trade account",
        "intro": "<p>Tell us about your business and we'll set you up with trade pricing and monthly invoicing. Approval usually takes one business day.</p>",
        "submit_label": "Submit application",
        "success_message": "Thanks — we'll be in touch within one business day.",
        "color_scheme": "scheme-1",
        "padding_top": 40,
        "padding_bottom": 52
      }
    }
  },
  "order": ["main"]
}
```

- [ ] **Step 4: Add form styles**

Append to `assets/trade.css`:

```css
.trade-form__grid {
  display: grid;
  gap: 0;
}

@media screen and (min-width: 750px) {
  .trade-form__grid {
    grid-template-columns: repeat(2, 1fr);
    column-gap: 1.6rem;
  }
}
```

- [ ] **Step 5: Create the page in the admin**

Online Store → Pages → Add page. Title `Trade application`, handle `trade-application`, template `page.trade-application`.

- [ ] **Step 6: Lint, push, verify**

```bash
npm run lint && npm run push:dev
curl -sL "https://unika.co.nz/pages/trade-application?preview_theme_id=$DEV_THEME_ID" | grep -c 'name="contact\[Business name\]"'
```

Expected: `1`.

- [ ] **Step 7: Submit a real test application**

Fill the form on the preview URL and submit. Confirm it arrives — Shopify contact form submissions go to the store's customer service email (Settings → Notifications).

- [ ] **Step 8: Add the Flow notification**

In **Flow**, create a workflow: trigger on a new contact submission, condition on `Enquiry type` containing `Trade account application`, action: send an internal email to whoever approves accounts.

> Approval stays manual: staff create the company and invite the buyer in the admin. Self-serve user management requires a Plus-only app (spec section 8).

- [ ] **Step 9: Commit**

```bash
git add sections/trade-application.liquid templates/page.trade-application.json assets/trade.css
git commit -m "feat: add trade account application page"
```

---

## Task 4: Contextual GST label

Two problems, verified against the live store:

1. **Collection pages** show `GST Excl.` to **every** visitor — right for trade,
   wrong for consumers. It appears 16 times on `/collections/all`.
2. **Product pages show no tax indication at all.** A customer looking at a
   ColorFill product page has no way to know whether GST is included. That is
   arguably the worse of the two.

The string exists in exactly **one** place: `snippets/card-product.liquid:207`,
rendered as `<span class="caption">GST Excl.</span>` directly after the price
snippet. There is no equivalent on the product template.

**Files:** Create `snippets/price-tax-note.liquid`

> **Scope deliberately limited.** This task makes the _label_ accurate. It does **not** change displayed prices. Whether retail prices should render GST-inclusive is a tax-presentation question with consumer-law implications in New Zealand — take it to the accountant, and prefer Shopify's native tax settings over arithmetic in Liquid. Recorded as an open question.

**Interfaces:**

- Consumes: `customer.b2b?`
- Produces: `snippets/price-tax-note.liquid`, rendered with no arguments

- [ ] **Step 1: Confirm the current state**

```bash
grep -rn "GST Excl" sections snippets templates locales
```

Expected: exactly one hit — `snippets/card-product.liquid:207`.

```bash
curl -sL "https://unika.co.nz/products/colorfill-box" | grep -c "GST"
```

Expected: `0` — confirming the product page carries no tax note at all.

- [ ] **Step 2: Create the snippet**

```liquid
{% comment %}
  Renders the tax note beneath a price.

  Trade customers think and buy in GST-exclusive terms; consumers expect
  GST-inclusive. This makes the label accurate for each audience.

  Note: this changes the LABEL only, not the price. Whether retail prices
  should render GST-inclusive is a tax-presentation decision — see the spec.

  Usage:
  {% render 'price-tax-note' %}
{% endcomment %}

<span class='price__tax caption'>
  {%- if customer.b2b? -%}
    GST Excl.
  {%- else -%}
    GST Excl. — GST added at checkout
  {%- endif -%}
</span>
```

- [ ] **Step 3: Replace the card label**

In `snippets/card-product.liquid`, replace line 207:

```liquid
<span class='caption'>GST Excl.</span>
```

with:

```liquid
{% render 'price-tax-note' %}
```

- [ ] **Step 3b: Add the note to the product page, where none exists**

In `sections/main-product.liquid`, find the price block — search for
`{% render 'price'` or the `price__container` element — and add immediately
after it:

```liquid
{% render 'price-tax-note' %}
```

This is new information for the customer, not a replacement. Verify placement
visually on the dev theme before committing.

- [ ] **Step 4: Lint, push, verify**

```bash
npm run lint && npm run push:dev
```

Collection page — the label is now contextual:

```bash
curl -sL "https://unika.co.nz/collections/all?preview_theme_id=$DEV_THEME_ID" | grep -c "GST added at checkout"
```

Expected: 16 or more.

Product page — a tax note now exists where there was none:

```bash
curl -sL "https://unika.co.nz/products/colorfill-box?preview_theme_id=$DEV_THEME_ID" | grep -c "GST"
```

Expected: `1` or more, against `0` before the change.

- [ ] **Step 5: [VERIFY AT STAGE 4]** Signed in as a test B2B customer, confirm the label reads plain `GST Excl.` with no "added at checkout" suffix.

- [ ] **Step 6: Commit**

```bash
git add snippets/price-tax-note.liquid snippets/card-product.liquid sections/main-product.liquid
git commit -m "feat: show an accurate, contextual GST note on cards and product pages"
```

---

## Task 5: Navigation entry point

There is no route to the trade pages today. Without this, Tasks 2 and 3 are unreachable.

**Files:** Shopify admin only — **no code**

- [ ] **Step 1: Add the menu item**

Online Store → Navigation → Main menu → Add menu item: `Trade` → `/pages/trade`

- [ ] **Step 2: Verify**

```bash
curl -sL "https://unika.co.nz/?preview_theme_id=$DEV_THEME_ID" | grep -c "/pages/trade"
```

Expected: `1` or more.

- [ ] **Step 3: [VERIFY AT STAGE 4]** Confirm a signed-in trade customer reaches the hub and sees the account branch.

> Menus are store data, not theme files — there is nothing to commit.

---

## Self-review notes

**Spec coverage.** Implements spec section 9 items 3, 4 and 5 (trade entry point, application flow, contextual GST), plus the company location picker, which shopify.dev names as a B2B theme requirement and which the spec had not captured. Items 1 and 2 are in the companion plan.

**Not covered:** saved lists and quick-order-by-SKU. Both are worth doing once real trade customers reveal whether they want them — building them now would be guessing.

**Testing limitation:** every `customer.b2b?` branch is unverifiable until B2B is enabled. Those steps are marked [VERIFY AT STAGE 4]. What _is_ verified now is that no B2B-only markup leaks to retail visitors, which is the failure mode that would actually hurt.
