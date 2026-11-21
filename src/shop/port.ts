/**
 * What the shop's pages ask of Adminium, and the shapes it answers in.
 *
 * The pages never work a figure out: a price is the variant's own, a basket's
 * and a checkout's figures a dry run of the order, a total the row the order
 * wrote, a ships-by and an arrival window the dates Adminium stamped or
 * estimated. Money stays the decimal Adminium sent ("189.00", or 189) until it
 * is formatted.
 */
export type Id = string | number;
export type Row = Record<string, unknown>;

export interface Category {
  id: Id;
  name: string;
  slug: string;
  icon: string | null;
  position: number;
  /** How many products are on sale in it, as Adminium counts them. */
  count: number;
}

/** A spec row as the shop typed it ("Fabric", "3-layer nylon"). */
export type Spec = [string, string];

export interface Product {
  id: Id;
  name: string;
  slug: string;
  categoryId: Id | null;
  categoryName: string;
  price: string;
  blurb: string | null;
  description: string | null;
  specs: Spec[];
  sizeGuideId: Id | null;
  /** What its size is called on the page ("Size", "US size"). */
  sizeName: string | null;
  featured: boolean;
  /** New this season until this day (`YYYY-MM-DD`), or null. */
  newUntil: string | null;
  createdAt: string | null;
  variantsCount: number;
}

export interface Variant {
  id: Id;
  productId: Id;
  colourId: Id | null;
  sizeId: Id | null;
  colourCode: string | null;
  sizeCode: string | null;
  colourLabel: string | null;
  sizeLabel: string | null;
  sku: string;
  /** What it costs more than the product, as the shop set it. */
  priceDelta: string;
  /** Its own price, as Adminium worked it out. */
  price: string;
  /** Marked sold out by hand, for a variant no stock item counts (STK-5). */
  soldOut: boolean;
}

export interface OptionValue {
  id: Id;
  productId: Id;
  kind: "colour" | "size";
  code: string;
  label: string;
  hex: string | null;
  position: number;
}

export interface Picture {
  id: Id;
  productId: Id;
  colourId: Id | null;
  url: string | null;
  alt: string | null;
}

export interface SizeGuide {
  id: Id;
  name: string;
  columns: string[];
  rows: string[][];
  note: string | null;
}

export interface Region {
  id: Id;
  code: string;
  name: string;
  zoneId: Id | null;
  taxRate: string;
}

export interface Zone {
  id: Id;
  code: string;
  label: string;
}

export interface ShippingService {
  id: Id;
  code: string;
  label: string;
  transitMin: number | null;
  transitMax: number | null;
  position: number;
}

/** A service's price to one zone, and the goods it is free from. */
export interface ShippingOffer {
  id: Id;
  serviceId: Id;
  zoneId: Id;
  price: string;
  freeFrom: string | null;
  serviceLabel: string;
  transitMin: number | null;
  transitMax: number | null;
}

export interface Closure {
  id: Id;
  from: string;
  to: string;
  reason: string | null;
}

export interface GiftAmount {
  id: Id;
  amount: string;
  position: number;
}

/** The shop's public face, as its owner typed it in Settings. */
export interface ShopSettings {
  name: string;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateCode: string | null;
  zip: string | null;
  takingOrders: boolean;
  payHoldMinutes: number | null;
  transferOn: boolean;
  transferDays: number | null;
  returnDays: number | null;
  refundShippingFaulty: boolean;
  maxPieces: number | null;
  promises: string[];
  about: string | null;
  privacy: string | null;
  terms: string | null;
  reviewLink: string | null;
}

/** What every page reads once: the shop's settings and the rows it ships and prices by. */
export interface ShopBase {
  settings: ShopSettings;
  categories: Category[];
  regions: Region[];
  zones: Zone[];
  services: ShippingService[];
  offers: ShippingOffer[];
  closures: Closure[];
  giftAmounts: GiftAmount[];
  sizeGuides: SizeGuide[];
  /** Every colour and size the shop makes, for the listing's filters. */
  facets: OptionValue[];
}

/** The server's zone, money and clock, from its config. */
export interface ShopConfig {
  timezone: string;
  currency: string | null;
  /** Adminium's clock when the shop loaded (ISO). */
  now: string | null;
}

export type SortKey = "featured" | "newest" | "low" | "high" | "name";

/** What a shopper asks of the product list. Adminium filters, searches, sorts, counts and pages it. */
export interface ProductQuery {
  categoryId?: Id | null;
  colour?: string | null;
  size?: string | null;
  /** Price up to, as a decimal. */
  priceMax?: string | null;
  featured?: boolean;
  q?: string | null;
  sort?: SortKey;
  limit?: number;
  cursor?: string | null;
}

export interface ProductPage {
  products: Product[];
  next: string | null;
  /** How many match, on the first page only: up to 1,000, `atLeast` past that. */
  count: { rows: number; atLeast: boolean } | null;
}

/** Everything a product's page shows beside the product. */
export interface ProductDetail {
  variants: Variant[];
  options: OptionValue[];
  pictures: Picture[];
}

/** Inventory's words for one variant: in, low (with how many are left where the shop shows it) or out. */
export interface StockWord {
  state: "in" | "low" | "out";
  left: number | null;
}

export interface Review {
  id: Id;
  stars: number;
  title: string | null;
  body: string | null;
  name: string | null;
  at: string | null;
}

/** A product's published reviews and their totals, all Adminium's; null when reviews are off. */
export interface Reviews {
  count: number;
  /** The average to one decimal, as text ("4.0"), worked out from Adminium's sum and count. */
  sum: number;
  bars: [number, number, number, number, number];
  list: Review[];
}

export type OrderKind = "goods" | "gift";
export type PayMethod = "online" | "transfer";

/** One line of an order as the page sends it. */
export interface LineValues {
  variant_id: Id;
  qty: number;
}

export interface GiftValues {
  amount_id: Id;
  to_name?: string;
  to_email: string;
  message?: string;
}

/** An order as the page sends it: the shopper's values, its lines, gift cards, typed codes and a gift card paying. */
export interface OrderBody {
  values: Row;
  children: {
    order_lines?: { values: LineValues }[];
    gift_lines?: { values: GiftValues }[];
    order_codes?: { values: { typed: string } }[];
    payments?: { values: { card_code: string } }[];
  };
}

/** One reduction as Adminium named it. */
export interface Applied {
  line: string | null;
  name: string;
  kind: string;
  amount: string;
  typed: boolean;
  codeLast4?: string;
}

/** What an add-on ledger says of the order (stock, a gift card). */
export interface Posting {
  ledger: string;
  state: "ok" | "refused" | "unavailable";
  reason?: string;
  line?: number;
  left?: string;
  path?: (string | number)[];
}

/** What a dry run answers: every figure the save would write, nothing kept. */
export interface Quote {
  order: Row;
  lines: Row[];
  gifts: Row[];
  applied: Applied[];
  postings: Posting[];
  /** What a gift card takes, and what is still to pay. */
  payment: { amount: string; due: string } | null;
}

/** An order placed: its figures, its own link and where to pay it. */
export interface Placed extends Quote {
  replayed: boolean;
  link: { token: string } | null;
  payUrl: string | null;
}

/** Whether the shop takes payments online right now; `test` while someone who manages payments rehearses here. */
export interface PayOffer {
  online: boolean;
  test: boolean;
}

export type PayState = "none" | "open" | "confirming" | "paid" | "failed" | "expired";

/** Paying for an order online: never a card field; the amount is always the order's. */
export interface ShopPayments {
  /** Never throws: no answer is "not now". */
  available(): Promise<PayOffer>;
  /** The order's pay link, through the session that reads it (its own link's, or the shopper's sign-in). */
  start(via: "link" | "mine", orderId: Id): Promise<string>;
  /** How the order's newest online payment stands. */
  state(via: "link" | "mine", orderId: Id): Promise<PayState>;
}

/** A refusal, as the pages read it. */
export interface Refused {
  code: string;
  status: number;
  column: string | null;
  child: string | null;
  index: number | null;
  reason: string | null;
  /** On a changed price: the figures the save came to. */
  changed: { total: string | null; lines: Row[] } | null;
  /** Seconds to wait before asking again (a rate limit, a code asked too soon). */
  retryAfter: number | null;
  params: Row;
}

/** A refusal is a thrown `ShopError`; anything else is a failure to reach Adminium. */
export class ShopError extends Error {
  readonly refused: Refused;
  constructor(refused: Refused, message: string) {
    super(message);
    this.name = "ShopError";
    this.refused = refused;
  }
}

export const isShopError = (error: unknown): error is ShopError => error instanceof ShopError;

/** The shop's door: everything the pages ask of Adminium, through the shop's own key. */
export interface ShopPort {
  config(): Promise<ShopConfig>;
  base(): Promise<ShopBase>;
  products(query: ProductQuery): Promise<ProductPage>;
  productBySlug(slug: string): Promise<Product | null>;
  detail(productId: Id): Promise<ProductDetail>;
  /** Variants by id (a basket's lines), each with its product's id. */
  variantsByIds(ids: readonly Id[]): Promise<Variant[]>;
  /** The variants of several products at once (a page of cards). */
  variantsOf(productIds: readonly Id[]): Promise<Variant[]>;
  /** Inventory's words for each variant asked, by its id. */
  stock(variantIds: readonly Id[]): Promise<Record<string, StockWord>>;
  /** A product's published reviews and totals; null while reviews are off. */
  reviews(productId: Id): Promise<Reviews | null>;
  /** A dry run of the order through the door open for it. */
  quote(kind: OrderKind, pay: PayMethod, body: OrderBody): Promise<Quote>;
  /** The order, saved once, at the total the shopper was shown. */
  place(kind: OrderKind, pay: PayMethod, body: OrderBody, clientKey: string, expectTotal: string): Promise<Placed>;
  payments(): ShopPayments;
  /** "Tell me when it's back", for a signed-in customer. */
  restock(variantId: Id): Promise<void>;
  /** The newsletter box: a customer found or made, with their yes. */
  newsSignup(email: string, language: string, clientKey: string): Promise<void>;
  /** A message to the shop. */
  enquiry(values: Row, clientKey: string): Promise<void>;
  /** A gift card's balance by its code; null when no card answers to it. */
  giftCard(code: string): Promise<{ balance: string; status: string; expiresOn: string | null } | null>;
}
