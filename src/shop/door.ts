/**
 * The shop's door into a real Adminium: the public API through the shop's
 * browser keys, one client each. The shop's own key (`customer`) reads the
 * catalogue, prices and places an order, and holds the customer's sign-in;
 * the `link` key opens the one order a link names.
 *
 * Every figure is Adminium's. A basket's and a checkout's figures are a dry
 * run of the order (`quote`); an order is saved once, carrying the total the
 * shopper was shown and a retry key, and a save that would come to another
 * total is refused with the figures it came to. A retry of an order already
 * made answers that order.
 *
 * Two reads the client has no words for yet are sent as they are: a product
 * list filtered through its variants (`via`) and counted, and nothing else.
 */
import { createPublicClient, pictureUrl, PublicApiError, type HeldSession, type ListOptions, type PublicClient, type PublicConfig, type PublicFilter } from "@adminiumjs/public-client";

import { AdminiumAfter } from "./after-door.ts";
import type { AfterPort } from "./after-port.ts";
import { ADD_ON_REFS, KEYS, linkRefs, shopRefs, type LinkRefs, type ShopRefs } from "./refs.ts";
import {
  ShopError,
  type Applied,
  type Category,
  type Id,
  type OptionValue,
  type OrderBody,
  type OrderKind,
  type PayMethod,
  type PayOffer,
  type PayState,
  type Picture,
  type Placed,
  type Posting,
  type Product,
  type ProductDetail,
  type ProductPage,
  type ProductQuery,
  type Quote,
  type Refused,
  type Reviews,
  type Row,
  type ShopBase,
  type ShopConfig,
  type ShopFeatures,
  type ShopPayments,
  type ShopPort,
  type ShopSettings,
  type SortKey,
  type Spec,
  type StockWord,
  type Variant,
} from "./port.ts";

export interface ShopServed {
  baseUrl: string;
  publishableKey: string;
  tables?: Record<string, string>;
  publicKeys?: Record<string, string>;
  /** The app's own settings, as `surface-config.json` serves them (its shipping days, its cut-off). */
  settings?: Record<string, unknown>;
  /** The write token of someone who manages payments, rehearsing the checkout here. Absent for anyone else. */
  rehearsalToken?: string;
  /** The add-ons installed for the app, as `surface-config.json` lists them. */
  addOns?: Record<string, { present?: boolean }>;
}

export interface ShopDoorOptions {
  /** Test seam; `globalThis.fetch` otherwise. */
  fetch?: typeof fetch;
  /** Test seam: the human check, as the client takes it. */
  humanCheck?: boolean | { refs?: readonly string[]; claim?: boolean };
}

const PAGE = 100;

/** Where a client's session is kept for the tab, so a reload stays signed in. */
const sessionSlot = (purpose: string) => `northline.shop.session.${purpose}`;

function keptSession(purpose: string): HeldSession | undefined {
  try {
    const raw = typeof sessionStorage === "undefined" ? null : sessionStorage.getItem(sessionSlot(purpose));
    if (raw === null) return undefined;
    const held = JSON.parse(raw) as HeldSession;
    return typeof held?.token === "string" && typeof held.expiresAt === "number" ? held : undefined;
  } catch {
    return undefined;
  }
}

function keepSession(purpose: string, session: HeldSession | null): void {
  try {
    if (typeof sessionStorage === "undefined") return;
    if (session === null) sessionStorage.removeItem(sessionSlot(purpose));
    else sessionStorage.setItem(sessionSlot(purpose), JSON.stringify(session));
  } catch {
    // not kept: the session lasts until the page goes
  }
}

// ── reading a row ───────────────────────────────────────────────────────────

const text = (value: unknown): string | null => (value === null || value === undefined || value === "" ? null : String(value));
const num = (value: unknown): number | null => (value === null || value === undefined || value === "" || Number.isNaN(Number(value)) ? null : Number(value));
/** A yes/no as every engine answers it (SQLite and MySQL may say 0 and 1). */
const yes = (value: unknown): boolean => value === true || value === 1 || value === "1" || value === "true";
const id = (value: unknown): Id | null => (value === null || value === undefined || value === "" ? null : (value as Id));
/** Money as Adminium sent it, as decimal text. */
const amount = (value: unknown): string => (value === null || value === undefined || value === "" ? "0" : String(value));
const byPosition = (a: { position: number; id: Id }, b: { position: number; id: Id }) => a.position - b.position || Number(a.id) - Number(b.id);

/** JSON a column holds, whether the engine sent it parsed or as text. */
function json(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function specs(value: unknown): Spec[] {
  const raw = json(value);
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((row): Spec[] => {
    if (Array.isArray(row) && row.length >= 2) return [[String(row[0]), String(row[1])]];
    if (row !== null && typeof row === "object") {
      const r = row as Record<string, unknown>;
      const k = r["label"] ?? r["name"] ?? r["k"];
      const v = r["value"] ?? r["v"];
      if (k !== undefined && v !== undefined) return [[String(k), String(v)]];
    }
    return [];
  });
}

export function productOf(row: Row): Product {
  return {
    id: row["id"] as Id,
    name: String(row["name"] ?? ""),
    slug: String(row["slug"] ?? ""),
    categoryId: id(row["category_id"]),
    categoryName: String(row["category_name"] ?? ""),
    price: amount(row["price"]),
    blurb: text(row["blurb"]),
    description: text(row["description"]),
    specs: specs(row["specs"]),
    sizeGuideId: id(row["size_guide_id"]),
    sizeName: text(row["size_name"]),
    featured: yes(row["featured"]),
    newUntil: text(row["new_until"])?.slice(0, 10) ?? null,
    createdAt: text(row["created_at"]),
    variantsCount: num(row["variants_count"]) ?? 0,
  };
}

export function variantOf(row: Row): Variant {
  return {
    id: row["id"] as Id,
    productId: row["product_id"] as Id,
    colourId: id(row["colour_id"]),
    sizeId: id(row["size_id"]),
    colourCode: text(row["colour_code"]),
    sizeCode: text(row["size_code"]),
    colourLabel: text(row["colour_label"]),
    sizeLabel: text(row["size_label"]),
    sku: String(row["sku"] ?? ""),
    priceDelta: amount(row["price_delta"]),
    price: amount(row["price"]),
    soldOut: yes(row["sold_out"]),
  };
}

export const optionOf = (row: Row): OptionValue => ({
  id: row["id"] as Id,
  productId: row["product_id"] as Id,
  kind: row["kind"] === "size" ? "size" : "colour",
  code: String(row["code"] ?? ""),
  label: String(row["label"] ?? ""),
  hex: text(row["hex"]),
  position: num(row["position"]) ?? 0,
});

export const categoryOf = (row: Row): Category => ({
  id: row["id"] as Id,
  name: String(row["name"] ?? ""),
  slug: String(row["slug"] ?? ""),
  icon: text(row["icon"]),
  position: num(row["position"]) ?? 0,
  count: num(row["products_count"]) ?? 0,
});

export function settingsOf(row: Row): ShopSettings {
  return {
    name: String(row["shop_name"] ?? ""),
    email: text(row["email"]),
    phone: text(row["phone"]),
    addressLine1: text(row["address_line1"]),
    addressLine2: text(row["address_line2"]),
    city: text(row["city"]),
    stateCode: text(row["state_code"]),
    zip: text(row["zip"]),
    takingOrders: row["taking_orders"] === undefined || row["taking_orders"] === null ? true : yes(row["taking_orders"]),
    payHoldMinutes: num(row["pay_hold_minutes"]),
    transferOn: yes(row["transfer_on"]),
    transferDays: num(row["transfer_days"]),
    returnDays: num(row["return_days"]),
    refundShippingFaulty: yes(row["refund_shipping_faulty"]),
    maxPieces: num(row["max_pieces"]),
    promises: [row["promise_1"], row["promise_2"], row["promise_3"]].map(text).filter((p): p is string => p !== null),
    about: text(row["about"]),
    privacy: text(row["privacy"]),
    terms: text(row["terms"]),
    reviewLink: text(row["review_link"]),
  };
}

/** The base rows as the public API answers them. */
export interface BaseRows {
  settings: Row[];
  categories: Row[];
  regions: Row[];
  zones: Row[];
  services: Row[];
  offers: Row[];
  closures: Row[];
  giftAmounts: Row[];
  sizeGuides: Row[];
  options: Row[];
}

export function baseFrom(rows: BaseRows): ShopBase {
  const strings = (value: unknown): string[] => (Array.isArray(json(value)) ? (json(value) as unknown[]).map(String) : []);
  return {
    settings: settingsOf(rows.settings[0] ?? {}),
    categories: rows.categories.map(categoryOf).sort(byPosition),
    regions: rows.regions.map((r) => ({ id: r["id"] as Id, code: String(r["code"] ?? ""), name: String(r["name"] ?? ""), zoneId: id(r["zone_id"]), taxRate: amount(r["tax_rate"]) })).sort((a, b) => a.name.localeCompare(b.name)),
    zones: rows.zones.map((z) => ({ id: z["id"] as Id, code: String(z["code"] ?? ""), label: String(z["label"] ?? "") })),
    services: rows.services.map((s) => ({ id: s["id"] as Id, code: String(s["code"] ?? ""), label: String(s["label"] ?? ""), transitMin: num(s["transit_min"]), transitMax: num(s["transit_max"]), position: num(s["position"]) ?? 0 })).sort(byPosition),
    offers: rows.offers.map((o) => ({ id: o["id"] as Id, serviceId: o["service_id"] as Id, zoneId: o["zone_id"] as Id, price: amount(o["price"]), freeFrom: text(o["free_from"]), serviceLabel: String(o["service_label"] ?? ""), transitMin: num(o["transit_min"]), transitMax: num(o["transit_max"]) })),
    closures: rows.closures.map((c) => ({ id: c["id"] as Id, from: String(c["from_date"] ?? "").slice(0, 10), to: String(c["to_date"] ?? "").slice(0, 10), reason: text(c["reason"]) })),
    giftAmounts: rows.giftAmounts.map((g) => ({ id: g["id"] as Id, amount: amount(g["amount"]), position: num(g["position"]) ?? 0 })).sort(byPosition),
    sizeGuides: rows.sizeGuides.map((g) => ({
      id: g["id"] as Id,
      name: String(g["name"] ?? ""),
      columns: strings(g["columns_json"]),
      rows: (Array.isArray(json(g["rows_json"])) ? (json(g["rows_json"]) as unknown[]) : []).map((r) => (Array.isArray(r) ? r.map(String) : [])),
      note: text(g["note"]),
    })),
    facets: rows.options.map(optionOf).sort(byPosition),
  };
}

/** A product list's order, as the shopper's sort names it; the row's key always breaks a tie. */
export const SORT_ORDER: Record<SortKey, string> = {
  featured: "position.asc",
  newest: "created_at.desc",
  low: "price.asc",
  high: "price.desc",
  name: "name.asc",
};

/** The filters a shopper's query sends, on the list and through its variants. */
export function productFilters(query: ProductQuery): { where: PublicFilter | null; via: PublicFilter | null } {
  const where: PublicFilter[] = [];
  if (query.categoryId !== undefined && query.categoryId !== null) where.push({ column: "category_id", op: "eq", value: query.categoryId });
  if (query.priceMax !== undefined && query.priceMax !== null) where.push({ column: "price", op: "lte", value: Number(query.priceMax) });
  if (query.featured === true) where.push({ column: "featured", op: "eq", value: true });
  const via: PublicFilter[] = [];
  if (query.colour) via.push({ column: "colour_code", op: "eq", value: query.colour });
  if (query.size) via.push({ column: "size_code", op: "eq", value: query.size });
  return { where: where.length === 0 ? null : { and: where }, via: via.length === 0 ? null : { and: via } };
}

/** The client's refusal as the pages read one. */
export function refusalOf(error: unknown): Refused | null {
  if (!(error instanceof PublicApiError)) return null;
  const params = (error as unknown as { params?: Row }).params ?? {};
  const changed = error.priceChanged;
  return {
    code: error.code,
    status: error.status,
    column: typeof params["column"] === "string" ? params["column"] : null,
    child: typeof params["child"] === "string" ? params["child"] : null,
    index: typeof params["index"] === "number" ? params["index"] : null,
    reason: typeof params["reason"] === "string" ? params["reason"] : null,
    changed: changed === null ? null : { total: changed.total, lines: (changed.lines["order_lines"] ?? []).map((line) => line.data) },
    retryAfter: error.retryAfterSeconds,
    params,
  };
}

/** Runs a call, turning Adminium's refusal into a `ShopError` the pages read. */
export async function answer<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    const refused = refusalOf(error);
    if (refused !== null) throw new ShopError(refused, (error as Error).message);
    throw error;
  }
}

function quoteFrom(reply: { data: Row; children: Record<string, { data: Row }[]>; applied?: Applied[]; postings?: Posting[]; payment?: { amount: string; due: string } | null }): Quote {
  return {
    order: reply.data,
    lines: (reply.children["order_lines"] ?? []).map((l) => l.data),
    gifts: (reply.children["gift_lines"] ?? []).map((l) => l.data),
    applied: reply.applied ?? [],
    postings: reply.postings ?? [],
    payment: reply.payment ?? null,
  };
}

/** The place-order door for an order of this kind, paid this way. */
export function placeRef(refs: ShopRefs, kind: OrderKind, pay: PayMethod): string {
  if (kind === "goods") return pay === "online" ? refs.placeGoodsOnline : refs.placeGoodsTransfer;
  return pay === "online" ? refs.placeGiftOnline : refs.placeGiftTransfer;
}

export class AdminiumShop implements ShopPort {
  readonly served: ShopServed;
  readonly refs: ShopRefs;
  readonly linkRefs: LinkRefs;
  private readonly fetchImpl: typeof fetch;
  /** The shop's own key: the catalogue, placing an order, and the customer's sign-in. */
  readonly client: PublicClient;
  /** The order's own link key: the session a link opens is held here. Null where Adminium serves none. */
  readonly linkClient: PublicClient | null;
  private config$: Promise<PublicConfig> | null = null;
  private afterDoor: AfterPort | null = null;

  constructor(served: ShopServed, options: ShopDoorOptions = {}) {
    this.served = served;
    this.refs = shopRefs(served.tables);
    this.linkRefs = linkRefs(served.tables);
    this.fetchImpl = options.fetch ?? ((...args: Parameters<typeof fetch>) => globalThis.fetch(...args));
    const make = (publishableKey: string, humanCheck: ShopDoorOptions["humanCheck"], purpose: string) => {
      const held = keptSession(purpose);
      return createPublicClient({
        baseUrl: served.baseUrl,
        publishableKey,
        ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
        ...(humanCheck === undefined ? {} : { humanCheck }),
        ...(held === undefined ? {} : { session: held }),
        ...(served.rehearsalToken === undefined ? {} : { csrfToken: served.rehearsalToken }),
        onSessionChange: (session: HeldSession | null) => keepSession(purpose, session),
      } as Parameters<typeof createPublicClient>[0]);
    };
    // Placing an order, the two forms and signing in ask the human check: solved before they are sent.
    const r = this.refs;
    const asks = [r.placeGoodsOnline, r.placeGiftOnline, r.placeGoodsTransfer, r.placeGiftTransfer, r.enquiries, r.news];
    const client = make(served.publishableKey, options.humanCheck ?? { refs: asks, claim: true }, "customer");
    if (client === null) throw new Error("The shop's key could not be used.");
    this.client = client;
    const linkKey = served.publicKeys?.[KEYS.link];
    this.linkClient = linkKey === undefined ? null : make(linkKey, false, KEYS.link);
  }

  private clientConfig(): Promise<PublicConfig> {
    this.config$ ??= this.client.config().catch((error: unknown) => {
      this.config$ = null;
      throw error;
    });
    return this.config$;
  }

  /**
   * A read sent as it is, through a client's key and session: the words the
   * client does not send yet (`via`, a count). Refusals come back as the
   * client's own errors.
   */
  async raw<T>(client: PublicClient, key: string, path: string, init: RequestInit = {}): Promise<T> {
    const session = client.session();
    const headers: Record<string, string> = {
      authorization: `Bearer ${key}`,
      ...(init.body === undefined ? {} : { "content-type": "application/json" }),
      ...(session === null ? {} : { "x-adminium-public-session": session.token }),
      ...(init.method !== undefined && init.method !== "GET" && this.served.rehearsalToken !== undefined ? { "x-adminium-csrf": this.served.rehearsalToken } : {}),
    };
    let res: Response;
    try {
      res = await this.fetchImpl(`${this.served.baseUrl}${path}`, { ...init, headers });
    } catch (cause) {
      throw new PublicApiError("PUBLIC_NETWORK_UNAVAILABLE", 0, `could not reach ${this.served.baseUrl}: ${String(cause)}`, undefined, {});
    }
    const body = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string; params?: Row; details?: Row } } | null;
    if (!res.ok) {
      const err = body?.error ?? {};
      const retry = Number(res.headers.get("retry-after"));
      throw new PublicApiError((err.code ?? "PUBLIC_QUERY_REFUSED") as never, res.status, err.message ?? "refused", Number.isFinite(retry) && retry > 0 ? retry : undefined, err.params ?? err.details ?? {});
    }
    return body as T;
  }

  private async all(ref: string, options: ListOptions = {}): Promise<Row[]> {
    const rows: Row[] = [];
    let cursor: string | undefined;
    for (let i = 0; i < 20; i += 1) {
      const page = await this.client.list<Row>(ref, { ...options, limit: PAGE, ...(cursor === undefined ? {} : { cursor }) });
      rows.push(...page.data);
      const next = page.cursor?.next ?? null;
      if (next === null || next === "" || page.data.length === 0) break;
      cursor = next;
    }
    return rows;
  }

  config(): Promise<ShopConfig> {
    return answer(async () => {
      const config = await this.clientConfig();
      return { timezone: config.timezone, currency: config.currency, now: (config as { now?: string }).now ?? null };
    });
  }

  base(): Promise<ShopBase> {
    return answer(async () => {
      const r = this.refs;
      const [settings, categories, regions, zones, services, offers, closures, giftAmounts, sizeGuides, options] = await Promise.all(
        [r.settings, r.categories, r.regions, r.zones, r.services, r.offers, r.closures, r.giftAmounts, r.sizeGuides, r.options].map((ref) => this.all(ref)),
      );
      return baseFrom({ settings: settings!, categories: categories!, regions: regions!, zones: zones!, services: services!, offers: offers!, closures: closures!, giftAmounts: giftAmounts!, sizeGuides: sizeGuides!, options: options! });
    });
  }

  products(query: ProductQuery): Promise<ProductPage> {
    return answer(async () => {
      const { where, via } = productFilters(query);
      const p = new URLSearchParams();
      if (where !== null) p.set("where", JSON.stringify(where));
      if (via !== null) p.set("via", JSON.stringify(via));
      const q = (query.q ?? "").trim();
      if (q.length >= 2) p.set("q", q);
      p.set("order", SORT_ORDER[query.sort ?? "featured"]);
      p.set("limit", String(query.limit ?? 12));
      if (query.cursor) p.set("cursor", query.cursor);
      const reply = await this.raw<{ data: Row[]; cursor?: { next: string | null }; count?: { rows: number; atLeast: boolean } }>(this.client, this.served.publishableKey, `/api/v1/public/records/${this.refs.products}?${p.toString()}`);
      return { products: reply.data.map(productOf), next: reply.cursor?.next ?? null, count: reply.count ?? null };
    });
  }

  productBySlug(slug: string): Promise<Product | null> {
    return answer(async () => {
      const page = await this.client.list<Row>(this.refs.products, { where: { column: "slug", op: "eq", value: slug }, limit: 1 });
      const row = page.data[0];
      return row === undefined ? null : productOf(row);
    });
  }

  detail(productId: Id): Promise<ProductDetail> {
    return answer(async () => {
      const where: PublicFilter = { column: "product_id", op: "eq", value: productId };
      const [variants, options, pictures, config] = await Promise.all([this.all(this.refs.variants, { where }), this.all(this.refs.options, { where }), this.all(this.refs.pictures, { where }), this.clientConfig()]);
      return {
        variants: variants.map(variantOf),
        options: options.map(optionOf).sort(byPosition),
        pictures: pictures
          .map((row) => ({ row, position: num(row["position"]) ?? 0 }))
          .sort((a, b) => a.position - b.position)
          .map(({ row }): Picture => ({
            id: row["id"] as Id,
            productId: row["product_id"] as Id,
            colourId: id(row["colour_id"]),
            url: pictureUrl(this.served.baseUrl, config, this.refs.pictures, String(row["id"]), "picture", row["picture"]),
            alt: text(row["alt"]),
          })),
      };
    });
  }

  variantsByIds(ids: readonly Id[]): Promise<Variant[]> {
    return answer(async () => {
      const out: Variant[] = [];
      const unique = [...new Set(ids.map(String))];
      for (let i = 0; i < unique.length; i += 50) {
        out.push(...(await this.all(this.refs.variants, { where: { column: "id", op: "in", value: unique.slice(i, i + 50) } })).map(variantOf));
      }
      return out;
    });
  }

  variantsOf(productIds: readonly Id[]): Promise<Variant[]> {
    return answer(async () => {
      const out: Variant[] = [];
      const unique = [...new Set(productIds.map(String))];
      for (let i = 0; i < unique.length; i += 50) {
        out.push(...(await this.all(this.refs.variants, { where: { column: "product_id", op: "in", value: unique.slice(i, i + 50) } })).map(variantOf));
      }
      return out;
    });
  }

  stock(variantIds: readonly Id[]): Promise<Record<string, StockWord>> {
    return answer(async () => {
      const out: Record<string, StockWord> = {};
      const unique = [...new Set(variantIds.map(String))];
      for (let i = 0; i < unique.length; i += 60) {
        const rows = (await this.client.parentAvailability(this.refs.stock, { under: unique.slice(i, i + 60) })) as unknown as { id: Id; state: string; left?: number | string }[];
        for (const row of rows) {
          const state = row.state === "out" || row.state === "low" ? row.state : "in";
          out[String(row.id)] = { state, left: row.left === undefined || row.left === null ? null : Number(row.left) };
        }
      }
      return out;
    });
  }

  reviews(productId: Id): Promise<Reviews | null> {
    return answer(async () => {
      try {
        const where: PublicFilter = { column: "about_key", op: "eq", value: String(productId) };
        const [totals, list] = await Promise.all([
          this.client.list<Row>(ADD_ON_REFS.reviewTotals, { where, limit: 10 }),
          this.client.list<Row>(ADD_ON_REFS.reviews, { where, order: "submitted_at.desc", limit: 20 }),
        ]);
        const row = totals.data.find((t) => String(t["about_table"] ?? "").endsWith("products")) ?? totals.data[0];
        const count = num(row?.["count"]) ?? 0;
        return {
          count,
          sum: num(row?.["sum"]) ?? 0,
          bars: [5, 4, 3, 2, 1].map((n) => num(row?.[`c${n}`]) ?? 0) as Reviews["bars"],
          list: list.data.map((r) => ({ id: r["id"] as Id, stars: num(r["stars"]) ?? 0, title: text(r["title"]), body: text(r["body"]), name: text(r["shown_name"]), at: text(r["submitted_at"]) })),
        };
      } catch (error) {
        // Reviews off, or Forms not there: the page shows no reviews at all.
        if (error instanceof PublicApiError && (error.status === 404 || error.code === "PUBLIC_SWITCHED_OFF")) return null;
        throw error;
      }
    });
  }

  quote(kind: OrderKind, pay: PayMethod, body: OrderBody): Promise<Quote> {
    return answer(async () => quoteFrom(await this.client.quote<Row>(placeRef(this.refs, kind, pay), { values: body.values, children: body.children as never })));
  }

  place(kind: OrderKind, pay: PayMethod, body: OrderBody, clientKey: string, expectTotal: string): Promise<Placed> {
    return answer(async () => {
      const made = await this.client.createTree<Row>(placeRef(this.refs, kind, pay), {
        values: { ...body.values, client_key: clientKey },
        children: body.children as never,
        expect: { total: expectTotal },
      });
      // The order's own link, a session on it already open: its page needs no claim.
      if (made.link !== null && this.linkClient !== null && made.link.session !== null && made.link.expiresAt !== null) {
        this.linkClient.adoptSession({ token: made.link.session, expiresAt: made.link.expiresAt, level: "verified" });
      }
      return {
        ...quoteFrom({ data: made.data, children: made.children, applied: made.applied, postings: [], payment: made.payment }),
        replayed: made.replayed,
        link: made.link === null ? null : { token: made.link.token },
        payUrl: made.payUrl ?? null,
      };
    });
  }

  payments(): ShopPayments {
    const refs = { link: this.linkRefs.order, mine: this.refs.myOrders };
    const through = (via: "link" | "mine") => {
      const client = via === "link" ? this.linkClient : this.client;
      if (client === null) throw new Error("This shop has no key for an order's own link.");
      return client;
    };
    return {
      available: async (): Promise<PayOffer> => {
        try {
          const said = await this.client.payments.available();
          return { online: said.online === true, test: said.test === true };
        } catch {
          return { online: false, test: false };
        }
      },
      start: (via, orderId) => answer(async () => (await through(via).payments.start(refs[via], String(orderId))).payUrl),
      state: (via, orderId) => answer(async (): Promise<PayState> => (await through(via).payments.state(refs[via], String(orderId))).state),
    };
  }

  restock(variantId: Id): Promise<void> {
    return answer(async () => {
      await this.client.create(this.refs.restock, { variant_id: variantId, language: documentLanguage() });
    });
  }

  newsSignup(email: string, language: string, clientKey: string): Promise<void> {
    return answer(async () => {
      await this.client.create(this.refs.news, { email, language, news: true, client_key: clientKey });
    });
  }

  enquiry(values: Row, clientKey: string): Promise<void> {
    return answer(async () => {
      await this.client.create(this.refs.enquiries, { ...values, client_key: clientKey });
    });
  }

  features(): ShopFeatures {
    const on = (key: string) => this.served.addOns?.[key]?.present === true;
    return { forms: on("forms"), offers: on("offers"), inventory: on("inventory") };
  }

  after(): AfterPort {
    this.afterDoor ??= new AdminiumAfter(this);
    return this.afterDoor;
  }

  giftCard(code: string): Promise<{ balance: string; status: string; expiresOn: string | null } | null> {
    return answer(async () => {
      const page = await this.client.list<Row>(ADD_ON_REFS.giftCard, { code: code.trim().toUpperCase(), limit: 1 });
      const row = page.data[0];
      return row === undefined ? null : { balance: amount(row["balance"]), status: String(row["status"] ?? ""), expiresOn: text(row["expires_on"]) };
    });
  }
}

/** The page's language, as Adminium writes it on a row (the customer's e-mails follow it). */
export function documentLanguage(): string {
  return (typeof document === "undefined" ? null : document.documentElement.getAttribute("lang")) ?? "en-US";
}
