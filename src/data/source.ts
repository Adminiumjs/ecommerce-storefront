// DataSource — the seam between the storefront UI and its catalog data.
//
// The demo implementation, `demoSource`, is backed by the static catalog in
// demo.ts. The second one now exists too: `adminiumSource.ts` reads a real
// Adminium instance through `@adminiumjs/public-client` and is swapped in by
// `main.tsx` before React mounts. `demoSource` remains the fallback whenever
// either build-time env var is absent — which is the case for every
// marketplace demo, and is why that fallback is structural rather than a catch.
//
// The contract is intentionally thin and SYNCHRONOUS. Connected mode keeps it
// that way: the whole read-set is fetched once, before the store is built, and
// handed over in these same shapes. Making these return Promises would touch
// every screen and every selector.
//
// `getShop` is new, and it is the biggest thing this app was hiding. The store's
// entire commerce policy — the brand, the free-shipping threshold, the promo
// code and its rate, the bundle discount, the tax rate and the three shipping
// prices — was imported STRAIGHT FROM THE SEED by the store, the pricing engine
// and five screens. A connected storefront would have charged the demo's 8.5%
// tax and honoured the demo's promo code against a real merchant's catalog.

import {
  BRAND,
  BUNDLE_OFF,
  CATS,
  CUSTOMER,
  FREE_SHIP,
  HERO_IMAGE,
  ORDERS,
  PRODUCTS,
  PROMO_CODE,
  PROMO_RATE,
  RATINGS,
  REVIEWPOOL,
  SHIP_EXPRESS,
  SHIP_OVERNIGHT,
  SHIP_STANDARD,
  TAX_RATE,
} from "./demo.ts";
import type {
  Category,
  Order,
  Product,
  RatingSeed,
  Review,
} from "./types.ts";

export interface Customer {
  name: string;
  email: string;
  initials: string;
}

/** The merchant's own settings. None of these has a column in `db/schema.sql`. */
export interface Shop {
  /** The shop's name. A proper noun, never translated. */
  brand: string;
  /** The image behind the home hero. */
  heroImage: string;
  /** Order subtotal at or above which shipping is free. */
  freeShip: number;
  /** The single promo code the storefront honours, or "" for none. */
  promoCode: string;
  /** What that code takes off, as a fraction. */
  promoRate: number;
  /** The multi-buy discount, as a fraction. */
  bundleOff: number;
  /** Sales tax, as a fraction. */
  taxRate: number;
  /** What each shipping method costs. */
  ship: { standard: number; express: number; overnight: number };
}

export interface DataSource {
  getProducts(): Product[];
  getCategories(): Category[];
  /** Seeded aggregate ratings, keyed by product id. */
  getRatings(): Record<string, RatingSeed>;
  /** The pool reviews are deterministically sampled from, per product. */
  getReviewPool(): Review[];
  /** Seeded order history for the account view. */
  getOrders(): Order[];
  /** The signed-in demo customer. */
  getCustomer(): Customer;
  /** The merchant's brand, prices and policy. */
  getShop(): Shop;
}

export const demoSource: DataSource = {
  getProducts: () => PRODUCTS,
  getCategories: () => CATS,
  getRatings: () => RATINGS,
  getReviewPool: () => REVIEWPOOL,
  getOrders: () => ORDERS,
  getCustomer: () => CUSTOMER,
  getShop: () => ({
    brand: BRAND,
    heroImage: HERO_IMAGE,
    freeShip: FREE_SHIP,
    promoCode: PROMO_CODE,
    promoRate: PROMO_RATE,
    bundleOff: BUNDLE_OFF,
    taxRate: TAX_RATE,
    ship: { standard: SHIP_STANDARD, express: SHIP_EXPRESS, overnight: SHIP_OVERNIGHT },
  }),
};

let current: DataSource = demoSource;
let read = false;

/**
 * The source the app is currently wired to.
 *
 * An indirection rather than a re-export, because `state/store.ts` reads it at
 * MODULE SCOPE — a re-exported binding would be captured at import time and a
 * later swap would change nothing.
 */
export const source: DataSource = {
  getProducts: () => ((read = true), current.getProducts()),
  getCategories: () => ((read = true), current.getCategories()),
  getRatings: () => ((read = true), current.getRatings()),
  getReviewPool: () => ((read = true), current.getReviewPool()),
  getOrders: () => ((read = true), current.getOrders()),
  getCustomer: () => ((read = true), current.getCustomer()),
  getShop: () => ((read = true), current.getShop()),
};

/**
 * Swap the backing source. Must happen before any module-scope read.
 *
 * The tripwire is the whole reason this is a function and not an assignment:
 * the ordering it depends on is invisible, and getting it wrong fails SILENTLY
 * — the app renders demo data against a configured backend and looks fine. A
 * thrown error at boot is the only way that mistake announces itself.
 */
export function setDataSource(next: DataSource): void {
  if (read) {
    throw new Error(
      "setDataSource() called after the store already read — import App dynamically, after the snapshot resolves.",
    );
  }
  current = next;
}

/** True once a real backend is behind the seam. */
export function isConnected(): boolean {
  return current !== demoSource;
}
