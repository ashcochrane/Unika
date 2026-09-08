# Unika NZ — Shopify theme

Theme for [unika.co.nz](https://unika.co.nz), operated by Beauty Craft.
Dawn-based, with Tailwind (prefixed `tw-`) compiled by Vite.

Store: `unika-nz.myshopify.com`

---

## ⚠️ `main` is production

The Shopify GitHub integration is connected to `main`. **Merging to `main` deploys to
the live storefront immediately.** There is no staging step in between.

Work on a branch. Preview with an unpublished dev theme. Merge only when you mean it.

---

## Setup

```bash
npm install
npm i -g @shopify/cli      # if not already installed
shopify auth login
```

Create an unpublished development theme in the Shopify admin, then put its ID in
`shopify.theme.toml` under `[environments.development]`.

## Everyday commands

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server with hot reload against the store |
| `npm run watch` | Rebuild Tailwind on change |
| `npm run build` | Build `styles/index.css` → `assets/app.css` (minified) |
| `npm run push:dev` | Push to the **unpublished dev theme** — safe |
| `npm run pull` | Pull current theme state down from Shopify |
| `npm run check` | Shopify Theme Check |
| `npm run lint` | Theme Check + Prettier check |
| `npm run format` | Auto-format JS/CSS/JSON |

## CSS build (currently inactive)

Tailwind is configured but **not wired into the theme**. There are zero `tw-` classes
in any Liquid file, `assets/app.css` does not exist, and `layout/theme.liquid` never
references it. The theme runs entirely on Dawn's stock stylesheets.

The toolchain is kept because Phase 2 (trade order grid, Colour Matcher) will use it.
To activate:

```bash
npm install
npm run build                     # styles/index.css -> assets/app.css
```

then add to `layout/theme.liquid` alongside the other stylesheets:

```liquid
{{ 'app.css' | asset_url | stylesheet_tag }}
```

`assets/app.css` is a build artifact but **must be committed** — Shopify does not run
builds. Rebuild and commit it after any change to `styles/index.css`.

## Structure

```
assets/      Theme assets + compiled app.css
sections/    Liquid sections (incl. unused quick-order-list — see CLAUDE.md)
snippets/    Reusable Liquid partials
templates/   JSON templates, incl. per-product-line customisations
styles/      Tailwind source (NOT uploaded to the theme)
```

## Project context

See [`CLAUDE.md`](./CLAUDE.md) for the trade portal build, platform decisions and
AU-readiness rules.

---

Based on [Dawn](https://github.com/Shopify/dawn) (MIT).
