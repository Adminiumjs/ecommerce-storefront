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

/**
 * SOMEWHERE A PARCEL CAN GO, OR BE SENT FROM.
 *
 * ── WHY A STOREFRONT NEEDS ONE AT ALL ──────────────────────────────────────
 *
 * This app knew every address it needed EXCEPT its own. The checkout collects
 * the customer's street into `Form`, the confirmation prints it back, and the
 * seeded order history carries `addr` and `city` as two loose strings — because
 * for a shop that only ever has to say "we posted it", where the parcel STARTS
 * never comes up. It comes up the moment anything has to price the journey: a
 * delivery estimate is a function of two ends, and a shop that cannot state its
 * own end can only be quoted a flat fee it made up.
 *
 * So the shop gets an address, and it is a MERCHANT SETTING — it sits on
 * `Shop` in `data/source.ts` beside the tax rate and the free-shipping
 * threshold, arrives through the same seam, and has the same connected-mode
 * problem: see `NO_POLICY` in `data/adminiumSource.ts`.
 *
 * ── THE SHAPE IS BORROWED ON PURPOSE ───────────────────────────────────────
 *
 * These five fields, with these names and these meanings, are what Adminium's
 * add-on host seam calls a `PostalAddress` — the shape its checkout and
 * dispatch payloads carry, and the one a delivery company reads. The SHAPE is
 * copied rather than invented so that handing this address to anything which
 * later reads it across that seam is a pass-through instead of a translation
 * layer somebody has to keep correct. If the seam's shape moves, this one
 * follows it; it does not get a private opinion about what an address is.
 *
 * It is copied and not IMPORTED even though a vendored copy of that seam now
 * sits in `src/add-ons/vendor/host/`, and the direction of the dependency is
 * the reason: `data/` is what this app is, and `add-ons/` is a thing that may
 * be switched off entirely (24 D6). A shop's own address is not conditional on
 * an add-on being connected, so the type that carries it may not be either.
 *
 * The one deliberate difference is that `lines` is mutable here and readonly
 * there. Every record in this file is copied on its way out of `data/source.ts`
 * and read by screens that hold no opinion about mutability, and a readonly
 * array in the middle of that would be the odd one out. It is still assignable
 * to the seam's readonly field, so the borrowing survives.
 *
 * `country` IS A CODE — `US`, never "United States" — for the reason the seam
 * gives: it is the one field in here a machine reads, because a delivery
 * company checks a postcode against a country. Everything else is text for a
 * label. Note that `Form.country`, which the CHECKOUT collects, is not held to
 * that rule and starts life as the display string `"United States"`; the
 * conversion lives in `add-ons/records.ts` and is documented there.
 */
export interface PostalAddress {
  /** Who the parcel is addressed to. For the shop's own end, its trading name. */
  name: string;
  /** Street lines, in the order they are written on the label. */
  lines: string[];
  city: string;
  postcode: string;
  /** ISO 3166-1 alpha-2. */
  country: string;
}

export type ShipMethod = "standard" | "express" | "overnight";

/**
 * A DELIVERY SOMEBODY ELSE QUOTED, as an order records it.
 *
 * ── WHY AN ORDER NEEDS A SECOND WAY TO SAY HOW IT SHIPS ────────────────────
 *
 * `ShipMethod` is this shop's own three bands, and it is a CLOSED union baked
 * into `Order.shipMethod`, `Order.ship`, `shipFee`, `confTotals` and two
 * `Record<ShipMethod, MessageKey>` maps on the confirmation screen. Those maps
 * are the reason it cannot grow a fourth member: a band's NAME and its ETA are
 * message keys this app writes, and a delivery service sold by somebody else
 * has neither — its name is its own, already translated by whoever sells it,
 * and its transit time is a fact about their network.
 *
 * So an order can carry one of these INSTEAD, beside the band rather than in
 * place of it. `shipMethod` stays whatever the shop's own picker held, so an
 * order records the band it would otherwise have gone by, and the confirmation
 * screen falls through to that band's words whenever this is absent — which is
 * every order placed before anything was connected, and every order placed
 * after a disconnect.
 *
 * ── THE SHAPE IS BORROWED, LIKE `PostalAddress` ABOVE ──────────────────────
 *
 * These six fields are what Adminium's add-on host seam calls a
 * `DeliveryChoice`: the one shape in that seam that travels BOTH ways — a fill
 * constructs it, the host stores it, and the host hands the same object back
 * down so the fill can draw which of its rows is selected. Copying the shape
 * rather than importing it keeps `data/` free of a dependency on a layer that
 * may be switched off entirely (24 D6), and keeps the assignment a
 * pass-through.
 *
 * `amount` IS IN MAJOR UNITS, and that is worth stating because the seam's
 * OTHER money-shaped field is not. `Money.amount`, one file over in the same
 * package, is documented as minor units — cents, pence, yen — and
 * `DeliveryChoice.amount` carries no unit comment at all while being quoted in
 * major ones. Reading across from the documented sibling put a $0.10 delivery
 * line under a $9.98 rate row on a real screen. `add-ons/records.ts` records
 * the whole account; this field holds what was quoted, unconverted, so the
 * stored record is a faithful copy rather than a rounding of one.
 */
export interface QuotedDelivery {
  /** Whose quote it was. An order placed through one service is not another's. */
  addOn: string;
  /** That service's own code for it. Opaque here; it is how the quoter re-selects. */
  code: string;
  /** Already in the reader's language — whoever sells it renders its name. */
  label: string;
  /** In the smallest unit of `currency`. */
  amount: number;
  /** ISO 4217. */
  currency: string;
  /** ISO date. */
  estimatedDelivery: string;
}

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
  /** What the customer actually chose, when it was not one of the shop's bands. */
  carrier?: QuotedDelivery;
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
