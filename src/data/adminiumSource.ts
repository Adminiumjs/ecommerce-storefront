// SPDX-License-Identifier: AGPL-3.0-only
/**
 * A `DataSource` backed by a real Adminium instance (28-public-surface.md §5.2,
 * 28-T28 wave 2).
 *
 * ── READS DO NOT BECOME ASYNC ──────────────────────────────────────────────
 * `loadSnapshot` fetches the read-set once, before React mounts, and hands back
 * the same SYNCHRONOUS shapes `demoSource` returns — so the store, the pricing
 * engine and every screen are untouched.
 *
 * ── THIS IS THE THINNEST SCHEMA IN THE FLEET, AND IT SHOWS ─────────────────
 * `db/schema.sql` is six tables and 73 lines: products, categories, the join
 * between them, customers, orders and order lines. The storefront above it
 * renders variants, swatch and chip options, personalisation, spec tables,
 * blurbs, long descriptions, aggregate ratings and reviews. NONE of those has a
 * column. A connected build therefore shows a real catalog with real titles,
 * prices and photographs — and no options, no reviews, no specs and no
 * description. That is not a mapping bug to work around; it is the honest
 * distance between this app and its own DDL, and closing it is 28-T36's job for
 * this repo. Every gap is marked G-n below and asserted in the tests.
 *
 * ── IDENTITY IS THE SKU, BECAUSE THERE IS NO SLUG ──────────────────────────
 * The app addresses a product by a slug (`"kb-k2"`); the database's only stable
 * text key is `sku`. So `Product.id` IS the SKU here. It is internally
 * consistent — order lines reach products by foreign key, never by name — but
 * unlike hotel-reservations or factory-ops the app's own identifier is not in
 * the database, so a merchant who re-SKUs a product changes its identity. That
 * is the argument for a `slug` column, and it is WS-I part 1 verbatim.
 *
 * ── NO ORDER HISTORY, AND THAT IS THE POINT ────────────────────────────────
 * G-6. The account view is EMPTY in connected mode and the customer is blank,
 * because a public storefront has no idea who is reading it. Listing the
 * merchant's orders to an anonymous visitor is not a feature with a rough edge,
 * it is every customer's name, e-mail and purchase history on a public page.
 * The read-set below therefore does not even ASK for `orders`, `orderItems` or
 * `customers` — a scope that cannot be read cannot leak. It comes back when the
 * claim flow lands (§3.4, gated on O2).
 */

import { createPublicClient, type PublicClient } from "@adminiumjs/public-client";

import type { Category, Order, Product, RatingSeed, Review } from "./types.ts";
import type { Customer, DataSource, Shop } from "./source.ts";

/* --------------------------------------------------------------- the wire */

interface WireProduct {
  id: number;
  title: string;
  sku: string;
  /** `numeric` serializes as a STRING, not a number. */
  price: string;
  image_url: string | null;
  status: string;
}

interface WireCategory {
  id: number;
  name: string;
  slug: string;
}

interface WireProductCategory {
  product_id: number;
  category_id: number;
}

/**
 * WS-I G-1 — the merchant's commerce policy, which has no home in the schema.
 *
 * Every number is ZERO and the brand and promo code are empty, deliberately.
 * The alternative is to carry the demo's: an 8.5% tax, a $6 shipping charge and
 * a working `WELCOME10` against a real merchant's catalog. The wrong number
 * here is money, and a visible zero is the only version of this that argues for
 * §5.5's settings record instead of quietly looking right.
 */
const NO_POLICY: Omit<Shop, "heroImage"> = {
  brand: "",
  freeShip: 0,
  promoCode: "",
  promoRate: 0,
  bundleOff: 0,
  taxRate: 0,
  ship: { standard: 0, express: 0, overnight: 0 },
};

/** WS-I G-3: `categories` has no icon column, so every tab wears the same one. */
const DEFAULT_CATEGORY_ICON = "tag";
/** WS-I G-3: nor does `products`. */
const DEFAULT_PRODUCT_ICON = "package";

/**
 * The columns the scope must expose, checked at boot.
 *
 * Three refs, and no more. See the header: the order tables are deliberately
 * outside this scope because nothing here can tell whose orders they are.
 */
const REQUIRED = {
  products: ["id", "title", "sku", "price", "image_url", "status"],
  categories: ["id", "name", "slug"],
  productCategories: ["product_id", "category_id"],
};

export interface Snapshot {
  products: Product[];
  categories: Category[];
  shop: Shop;
}

/**
 * The client, or null when either build-time variable is absent.
 *
 * The emptiness check is `createPublicClient`'s, not repeated here: it already
 * treats a missing or empty value as "this build has no server", and a second
 * copy of that rule is a second place for it to drift.
 */
export function clientFromEnv(): PublicClient | null {
  return createPublicClient({
    baseUrl: import.meta.env["VITE_ADMINIUM_API_BASE_URL"] as string | undefined,
    publishableKey: import.meta.env["VITE_ADMINIUM_PUBLISHABLE_KEY"] as string | undefined,
  });
}

/**
 * Read a whole ref, a page at a time.
 *
 * The page size is the SCOPE's — `refs[ref].limit` is the operator's ceiling
 * and asking for more than it allows is refused. A catalog larger than one page
 * would otherwise lose its tail silently, and a shop that is missing half its
 * products still looks like a working shop.
 */
async function listAll<T>(
  client: PublicClient,
  ref: string,
  size: number,
  max: number,
): Promise<T[]> {
  const out: T[] = [];
  const page = Math.max(1, Math.min(size, 500));
  for (let offset = 0; offset < max; offset += page) {
    const res = await client.list<T>(ref, { limit: page, offset });
    out.push(...res.data);
    if (res.data.length < page) return out;
  }
  console.warn(`[adminium] ${ref}: stopped at ${String(max)} rows — the rest were not read.`);
  return out;
}

/**
 * Fetch the read-set and map it into the app's shapes.
 *
 * Returns `null` on ANY failure so the caller falls back to demo mode
 * structurally rather than in a catch — the marketplace demos are static clones
 * with no server and must keep working byte-identically.
 */
export async function loadSnapshot(client: PublicClient): Promise<Snapshot | null> {
  try {
    await client.assertRefs(REQUIRED);
    const config = await client.config();
    const cap = (ref: string): number => config.refs[ref]?.limit ?? 100;

    const [products, categories, links] = await Promise.all([
      listAll<WireProduct>(client, "products", cap("products"), 20_000),
      listAll<WireCategory>(client, "categories", cap("categories"), 500),
      listAll<WireProductCategory>(client, "productCategories", cap("productCategories"), 50_000),
    ]);

    const slugOf = new Map<number, string>(categories.map((c) => [c.id, c.slug]));

    /* A product belongs to many categories in the database and to exactly one
     * on the storefront, which filters by a single tab. The lowest category id
     * wins — an arbitrary rule, but a STABLE one, so a product does not move
     * tabs between page loads. WS-I G-2. */
    const catOf = new Map<number, number>();
    for (const row of links) {
      const held = catOf.get(row.product_id);
      if (held === undefined || row.category_id < held) catOf.set(row.product_id, row.category_id);
    }

    const mapped: Product[] = [];
    for (const row of products) {
      /* `products.status` is the MERCHANT's word (draft / active / archived),
       * not the app's (`in` / `low` / `out`). They are different facts with the
       * same column name, and conflating them would put drafts on the shop
       * floor. Only `active` is for sale, and the schema carries no stock level
       * at all — so everything on sale reads as in stock. WS-I G-4. */
      if (row.status !== "active") continue;
      const categoryId = catOf.get(row.id);
      mapped.push({
        id: row.sku,
        title: row.title,
        price: Number(row.price),
        sku: row.sku,
        cat: categoryId === undefined ? "" : slugOf.get(categoryId) ?? "",
        status: "in",
        icon: DEFAULT_PRODUCT_ICON,
        tint: tintFor(row.sku),
        image: row.image_url ?? "",
        /* WS-I G-5 — none of these has a column: no blurb, no description, no
         * spec table, no options, no variants, no personalisation, and nothing
         * to mark a product featured. They are empty rather than invented, so
         * the product page is visibly bare instead of quietly fictional. */
        blurb: "",
        desc: "",
        specs: [],
      });
    }

    return {
      products: mapped,
      categories: categories.map((row) => ({
        slug: row.slug,
        name: row.name,
        icon: DEFAULT_CATEGORY_ICON,
      })),
      shop: {
        ...NO_POLICY,
        // The one merchant setting that CAN be derived from real data: the
        // hero wears the first product's photograph rather than an empty frame.
        heroImage: mapped.find((p) => p.image.length > 0)?.image ?? "",
      },
    };
  } catch (error) {
    console.warn("[adminium] connected mode unavailable, using demo data:", error);
    return null;
  }
}

/**
 * A stable, muted backdrop for a product photo while it loads.
 *
 * Presentation, not data (WS-I G-3): there is no tint column. Derived from the
 * SKU so a product keeps the same backdrop between loads and adding one does
 * not recolour the rest.
 */
function tintFor(sku: string): string {
  let h = 2_166_136_261 >>> 0;
  for (let i = 0; i < sku.length; i += 1) {
    h ^= sku.charCodeAt(i);
    h = Math.imul(h, 16_777_619) >>> 0;
  }
  // A narrow band of desaturated mid-tones: light enough for white text to sit
  // on, dark enough not to flash against the page.
  const hue = h % 360;
  return hslToHex(hue, 14, 52);
}

function hslToHex(h: number, s: number, l: number): string {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const channel = (n: number): string => {
    const k = (n + h / 30) % 12;
    const value = l / 100 - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * value)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

/** A synchronous `DataSource` over an already-fetched snapshot. */
export function snapshotSource(snap: Snapshot): DataSource {
  return {
    getProducts: () => snap.products.map((p) => ({ ...p, specs: [...p.specs] })),
    getCategories: () => snap.categories.map((c) => ({ ...c })),
    // WS-I G-5: no ratings table, no reviews table. The module renders its own
    // empty state, which is the truth about this deployment.
    getRatings: (): Record<string, RatingSeed> => ({}),
    getReviewPool: (): Review[] => [],
    // G-6: see the header. Not "not implemented" — deliberately absent.
    getOrders: (): Order[] => [],
    getCustomer: (): Customer => ({ name: "", email: "", initials: "" }),
    getShop: () => ({ ...snap.shop, ship: { ...snap.shop.ship } }),
  };
}
