/**
 * The public API's names for the shop's entries.
 *
 * Adminium names each entry of the manifest's `publicAccess` when it installs
 * the app: the table's real name, a suffix for what the entry is, and `_2`,
 * `_3`… for the next of the same, counted across both keys in the order the
 * manifest lists them (`src/manifest/public.ts`). The table's real name is the
 * one the server sends in `surface-config.json` (`orders` →
 * `ecommerce_shop_orders`); the suffixes are written out here, and the shop's
 * contract reads them back from a real install.
 */

/** Each entry the shop's own key opens: the table, and its suffix. */
export const SHOP_REFS = {
  // the catalogue, read by anyone
  products: ["products", ""],
  variants: ["variants", ""],
  stock: ["variants", "_availability"],
  options: ["option_values", ""],
  pictures: ["product_pictures", ""],
  categories: ["categories", ""],
  sizeGuides: ["size_guides", ""],
  services: ["shipping_services", ""],
  offers: ["shipping_offers", ""],
  regions: ["regions", ""],
  zones: ["zones", ""],
  closures: ["closures", ""],
  giftAmounts: ["gift_amounts", ""],
  settings: ["settings", ""],
  // placing an order: goods or gift cards alone, paid online or by bank transfer
  placeGoodsOnline: ["orders", "_verified_2"],
  placeGiftOnline: ["orders", "_verified_3"],
  placeGoodsTransfer: ["orders", "_verified_4"],
  placeGiftTransfer: ["orders", "_verified_5"],
  // the customer signed in with a code e-mailed to them
  customer: ["customers", "_claimed"],
  myOrders: ["orders", "_verified"],
  myLines: ["order_lines", "_verified"],
  myGifts: ["gift_lines", "_verified"],
  myPayments: ["payments", "_verified"],
  myRefunds: ["payment_refunds", "_verified"],
  myReturns: ["returns", "_verified"],
  myReturnLines: ["return_lines", "_verified"],
  askReturn: ["returns", "_verified_2"],
  restock: ["restock_requests", "_verified"],
  // a message to the shop, the newsletter box
  enquiries: ["enquiries", ""],
  news: ["news_signups", "_verified"],
} as const satisfies Record<string, readonly [string, string]>;

/** Each entry the order's own link key opens. */
export const LINK_REFS = {
  order: ["orders", "_claimed"],
  lines: ["order_lines", "_verified_2"],
  gifts: ["gift_lines", "_verified_2"],
  payments: ["payments", "_verified_2"],
  refunds: ["payment_refunds", "_verified_2"],
  returns: ["returns", "_verified_3"],
  returnLines: ["return_lines", "_verified_2"],
  askReturn: ["returns", "_verified_4"],
  askReturnLine: ["return_lines", "_verified_3"],
} as const satisfies Record<string, readonly [string, string]>;

/** The add-ons' own entries on the shop's key, by their real names (an add-on's tables are never the app's). */
export const ADD_ON_REFS = {
  /** Forms & surveys: the published reviews of a product, and their totals. */
  reviews: "forms_reviews",
  reviewTotals: "forms_review_totals",
  /** Offers & gift cards: one card's balance, opened by its code. */
  giftCard: "offers_gift_cards_unlocked",
} as const;

export type ShopRefName = keyof typeof SHOP_REFS;
export type LinkRefName = keyof typeof LINK_REFS;
export type ShopRefs = Record<ShopRefName, string>;
export type LinkRefs = Record<LinkRefName, string>;

/** The app's key, which names its tables when the server does not say (`ecommerce_shop_orders`). */
export const TABLE_PREFIX = "ecommerce_shop_";

function named<K extends string>(table: Readonly<Record<K, readonly [string, string]>>, tables: Readonly<Record<string, string>>): Record<K, string> {
  const out = {} as Record<K, string>;
  for (const [name, [t, suffix]] of Object.entries(table) as [K, readonly [string, string]][]) out[name] = `${tables[t] ?? `${TABLE_PREFIX}${t}`}${suffix}`;
  return out;
}

/** Every ref of the shop's key by its real name, from the server's table names. */
export const shopRefs = (tables: Readonly<Record<string, string>> = {}): ShopRefs => named(SHOP_REFS, tables);
/** Every ref of the order's own link key by its real name. */
export const linkRefs = (tables: Readonly<Record<string, string>> = {}): LinkRefs => named(LINK_REFS, tables);

/** The browser keys the shop uses beside its own, by the purpose Adminium serves them under. */
export const KEYS = {
  /** One order, by its own link (the manifest's `link` key). */
  link: "link",
} as const;
