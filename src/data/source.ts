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
  SHIP_FROM,
  SHIP_OVERNIGHT,
  SHIP_STANDARD,
  TAX_RATE,
} from "./demo.ts";
import type {
  Category,
  Order,
  PostalAddress,
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
  /**
   * WHERE THE SHOP POSTS FROM — the merchant's own address.
   *
   * The odd one out on this interface in one respect and not in another. Every
   * other member here is a NUMBER OR A WORD the merchant chose; this one is a
   * place. What makes it belong is the same thing that makes the tax rate
   * belong: it is a fact about the shop rather than about the catalogue, the
   * app has no column for it, and reading it from the seed while the products
   * come from a real merchant's database is precisely the failure this whole
   * interface was extracted to stop.
   *
   * NOT OPTIONAL, and that is a deliberate cost. Every shop that posts things
   * has an address; making the field optional would let a caller mount a
   * delivery surface having thought about it not at all, and the value of a
   * blank address is that it is VISIBLY blank rather than absent. The connected
   * source supplies an empty one when the scope exposes no `shop_settings`,
   * which is the same visible-zero argument `NO_POLICY` records for the rest of
   * this interface.
   */
  shipFrom: PostalAddress;
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
    // Copied to the depth the value actually has: the address holds an array,
    // and a shared `lines` would hand every caller the same one out of the
    // seed. `getShop()` is called at module scope by `lib/shop.ts` and again
    // by anything that wants the address later, so "nobody mutates it today"
    // is not a property worth relying on.
    shipFrom: { ...SHIP_FROM, lines: [...SHIP_FROM.lines] },
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
