# Unika NZ — Shopify theme

Theme for [unika.co.nz](https://unika.co.nz), operated by Beauty Craft.
Dawn-based, with Tailwind (prefixed `tw-`) compiled by Vite.

Store: `unika-nz.myshopify.com`

---

## ⚠️ `main` is production

The Shopify GitHub integration is connected to `main`. **Merging to `main` deploys to
the live storefront immediately.** There is no staging step in between.

Work on a branch. Preview with an unpublished dev theme. Merge only when you mean it.

**The sync has failed silently before.** The integration stopped committing live
changes back to git for 17 months (Apr 2025 – Jan 2026), so this repo held stale
content while the store had moved on. Merging would have reverted it.

**Run `npm run pull` before you start and before you merge.** Commit any drift first.

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

| Command            | What it does                                           |
| ------------------ | ------------------------------------------------------ |
| `npm run dev`      | Local dev server with hot reload against the store     |
| `npm run watch`    | Rebuild Tailwind on change                             |
| `npm run build`    | Build `styles/index.css` → `assets/app.css` (minified) |
| `npm run push:dev` | Push to the **unpublished dev theme** — safe           |
| `npm run pull`     | Pull current theme state down from Shopify             |
| `npm run check`    | Shopify Theme Check                                    |
| `npm run lint`     | Theme Check + Prettier check                           |
| `npm run format`   | Auto-format JS/CSS/JSON                                |

## Styling

This theme follows **Dawn's** conventions. There is no CSS build step — Tailwind,
PostCSS and Vite were removed because they were configured but never used.

For new UI:

- Section-scoped rules go in a `{% style %}` block (41 sections already do this).
- Shared component styles go in `assets/*.css`, loaded with
  `{{ 'component-x.css' | asset_url | stylesheet_tag }}`.
- **Respect the colour scheme.** 37 of 57 sections expose a `color_scheme` setting and
  render `color-{{ section.settings.color_scheme }}`. That is what allows recolouring
  from the theme editor. Use Dawn's CSS custom properties rather than literal colours,
  or the section silently loses a capability the rest of the theme has.

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
