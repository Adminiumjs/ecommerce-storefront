# Ecommerce Storefront

A complete, production-shaped e-commerce storefront — built with Vite + React +
TypeScript, no CSS framework, no backend required. It's the example app that
ships with [Adminium](https://adminium.dev): browse a catalog, configure product
variants, personalize items, run a cart with promo codes and a 4-step checkout,
and place a (demo) order — all from built-in demo data.

**Live demo → [adminium.dev/demo/ecommerce-storefront](https://adminium.dev/demo/ecommerce-storefront)**

## Highlights

- **State-based routing** (no router) — a single `view` value drives the whole
  app: home, listing, product, cart, checkout, confirmation, and account.
- **Real commerce logic** — a variant matrix with cross-option disabling and
  out-of-stock overlays, composite cart line-items (options + engraving +
  bundle), `WELCOME10` promo, free-shipping progress, tax, and shipping tiers.
- **Light / dark themes** via CSS custom properties, persisted to `localStorage`.
- **Real product photography** — every product, and the home hero, renders a
  real photo (`object-fit: cover`, lazy-loaded, with the product tint showing
  behind it while it loads). Self-hosted Manrope + JetBrains Mono and tree-shaken
  `lucide-react` icons round out the visuals.
- **No payment integration** — the checkout's card field only *mimics* Stripe
  Elements. Nothing is ever charged.

## Local development

```bash
npm install
npm run dev
```

Then open the URL Vite prints (default http://localhost:5173).

## Deploy

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Adminiumjs/ecommerce-storefront&project-name=ecommerce-storefront&repository-name=ecommerce-storefront)
&nbsp;
[![Deploy to DigitalOcean](https://www.deploytodo.com/do-btn-blue.svg)](https://cloud.digitalocean.com/apps/new?repo=https://github.com/Adminiumjs/ecommerce-storefront/tree/main)

- **Vercel** — click the button above, or import the repo. Build command
  `npm run build`, output `dist`.
- **DigitalOcean App Platform** — click the button above, or use the included
  [`.do/deploy.template.yaml`](.do/deploy.template.yaml).
- **Host anywhere** — `npm run build` produces a fully static `dist/` you can
  drop on any static host (Netlify, Cloudflare Pages, S3, GitHub Pages…). Or
  build the container:

  ```bash
  docker build -t ecommerce-storefront .
  docker run -p 8080:80 ecommerce-storefront
  ```

### Build scripts

| Script              | What it does                                                           |
| ------------------- | ---------------------------------------------------------------------- |
| `npm run dev`       | Start the Vite dev server.                                             |
| `npm run build`     | Type-check + build to `dist/` at base `/` (root deploys).              |
| `npm run build:demo`| Build to `dist/` at base `/demo/ecommerce-storefront/` (Adminium demo).|
| `npm run preview`   | Preview a production build locally.                                    |

## Full implementation (self-host)

There are two tiers to running this store.

**Tier 1 — the frontend, one click.** The Vercel / DigitalOcean buttons above
deploy the storefront on its own, running on the bundled demo catalog (now with
real product images). No database, no admin — a fully static preview.

**Tier 2 — the whole stack, one command.** [`docker-compose.yml`](docker-compose.yml)
stands up Postgres (seeded with the *same* catalog, prices, and images), an
auto-generated Adminium admin dashboard that manages the catalog and orders on
that real database, and the storefront:

```bash
cp .env.example .env      # then set ADMINIUM_SECRET — e.g. openssl rand -hex 32
docker compose up
```

- **Storefront** → http://localhost:8080
- **Adminium admin dashboard** → http://localhost:4600

On first boot, `shop-db` applies [`db/schema.sql`](db/schema.sql) then
[`db/seed.sql`](db/seed.sql), and Adminium imports the shop database as its first
source connection, introspects the schema, and generates the admin dashboard.
Finish the ~1-minute first-run wizard at `:4600` — it's pre-pointed at the seeded
shop DB. The storefront and the dashboard are the **same shop**: the 16 products,
their prices, and their images match one-for-one. The install spec Adminium reads
to configure itself is [`manifest.json`](manifest.json).

## Connecting to Adminium

All catalog access goes through a thin `DataSource` interface
([`src/data/source.ts`](src/data/source.ts)) with a single `demoSource`
implementation backed by the bundled catalog. Once Adminium's browser-safe
**publishable key** ships, the frontend will read **live** data — your real
products, orders, and reviews from the database above — through the Adminium
records API via a second `DataSource` implementation, without touching any of the
screens or the store. The seam is already in place.

## Project structure

```
src/
  app/         App shell + view switch
  state/       Zustand store (cart engine, filters, checkout, theme)
  data/        demo catalog, types, DataSource seam
  lib/         pricing, ratings, placeholders, formatting
  screens/     Home · Listing · Product · Cart · Checkout · Confirm · Account · NotFound
  components/  Header, Footer, ProductCard, CartDrawer, OptionPicker, modals, …
  styles/      tokens.css (design tokens) + base.css (fonts, utilities)
public/fonts/  self-hosted Manrope + JetBrains Mono (woff2)
```

## License

[AGPL-3.0](LICENSE) © 2026 Ecommerce Storefront. A demo shipped with Adminium.
