// Domain types for the storefront. These mirror the shape of the demo catalog
// and are what the DataSource contract (see source.ts) returns. A future
// backend implementation would return the same types.

export type Stock = "in" | "low" | "out";

export type OptionType = "swatch" | "chip";

export interface OptionValue {
  id: string;
  label: string;
  /** Fill color for swatch-type options. */
  hex?: string;
}

export interface ProductOption {
  key: string;
  name: string;
  type: OptionType;
  values: OptionValue[];
}

/** A single variant entry keyed by comma-joined option-value ids. */
export interface Variant {
  /** Stock status of this specific variant. Defaults to "in" when omitted. */
  s?: Stock;
  /** Price delta (surcharge) added to the base price for this variant. */
  d?: number;
}

export type CustomMode = "engrave" | "print";

export interface Personalization {
  mode: CustomMode;
  label: string;
  verb: string;
  fee: number;
  max: number;
  ph: string;
  logo?: boolean;
  logoFee?: number;
}

export interface Product {
  id: string;
  title: string;
  price: number;
  sku: string;
  cat: string;
  status: Stock;
  /** lucide icon name — kept as a compact fallback glyph. */
  icon: string;
  /** tint hex — shown as a subtle background behind the image while it loads. */
  tint: string;
  /** Product photo URL (real imagery; see demo.ts). */
  image: string;
  feat?: boolean;
  blurb: string;
  desc: string;
  specs: [string, string][];
  options?: ProductOption[];
  variants?: Record<string, Variant>;
  custom?: Personalization;
}

export interface Category {
  slug: string;
  name: string;
  icon: string;
}

/** [average, count] seed for a product's aggregate rating. */
export type RatingSeed = [number, number];

/** How long ago a review was posted, as an `Intl.RelativeTimeFormat` argument
 * pair. Stored rather than pre-rendered so "2 weeks ago" can come out as
 * "il y a 2 semaines" or "منذ أسبوعين" from the same seed. */
export type Ago = [value: number, unit: Intl.RelativeTimeFormatUnit];

export interface Review {
  name: string;
  initials: string;
  ago: Ago;
  verified: boolean;
  rating: number;
  title: string;
  body: string;
}

/** A user-submitted review (merged into a product's review list live). */
export interface UserReview {
  rating: number;
  title: string;
  body: string;
}

export type ShipMethod = "standard" | "express" | "overnight";

export type OrderStatus = "pending" | "paid" | "shipped" | "refunded";

/** Order-line for seeded history: either a [pid, qty] pair or a rich item. */
export type OrderItem =
  | [string, number]
  | {
      pid: string;
      qty: number;
      unit?: number;
      optLabel?: string;
      customLabel?: string;
    };

export interface OrderTotals {
  sub: number;
  disc: number;
  ship: number;
  shipFree: boolean;
  tax: number;
  total: number;
}

export interface Order {
  number: string;
  items: OrderItem[];
  status?: OrderStatus;
  /** ISO date (`YYYY-MM-DD`). Formatted for display through the i18n `date()`. */
  placed?: string;
  total?: number;
  shipMethod?: ShipMethod;
  ship?: ShipMethod;
  promoOn?: boolean;
  email?: string;
  name?: string;
  addr?: string;
  city?: string;
  country?: string;
  totals?: OrderTotals;
}

/** Selected option-value ids, keyed by option key. */
export type OptionSelection = Record<string, string>;

export interface CartCustom {
  text: string;
  logo: boolean;
}

export interface CartLine {
  pid: string;
  opts: OptionSelection;
  custom: CartCustom | null;
  qty: number;
  /** Bundle discount fraction applied to this line (e.g. 0.15). */
  disc: number;
}

export type Cart = Record<string, CartLine>;
