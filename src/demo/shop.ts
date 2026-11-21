/**
 * The shop's doors into the demo's Adminium: the catalogue and the order
 * (`ShopPort`) and the pages after an order (`AfterPort`), each answering as
 * the real ones do over the one world the desk reads — a dry run's figures
 * worked out by the manifest's rules, an order saved once at the total the
 * shopper was shown (refused, nothing written, when a price moved or the
 * last piece went), Inventory's words, Offers' codes and gift cards, a code
 * "e-mailed" before a sign-in opens, an order's own link.
 *
 * NO CARD FIELDS, NO MONEY. Paying online goes to the demo's own pay step
 * (`pay.ts`), reached by an address only the demo makes (`demo-pay:`); the
 * order is paid in the page's world and nothing leaves it.
 *
 * DEMO BUILD ONLY — nothing in a real build imports it.
 */
import type { AfterPort, CodeAnswer, Me, OrderRead, Receipt, ReturnAsk, ReviewState, ReviewValues, Via } from "../shop/after-port.ts";
import { baseFrom, optionOf, productOf, variantOf } from "../shop/door.ts";
import {
  ShopError,
  type Applied,
  type Id,
  type OrderBody,
  type OrderKind,
  type PayMethod,
  type PayState,
  type Placed,
  type Posting,
  type Product,
  type ProductDetail,
  type ProductPage,
  type ProductQuery,
  type Quote,
  type Refused,
  type Reviews,
  type ShopBase,
  type ShopConfig,
  type ShopFeatures,
  type ShopPayments,
  type ShopPort,
  type StockWord,
  type Variant,
} from "../shop/port.ts";
import { byId, cents, closuresIn, codeRefusal, deriveLine, deriveOrderMoney, freezeGift, freezeLine, freezeOrder, lineDiscounts, money, n, same, set, stampPlaced, type Code } from "./rules.ts";
import { STOCK, type Row } from "./sample.ts";
import { CUSTOMER, DemoRefusal, type DemoWorld } from "./world.ts";

/** Where the demo's pay step is: an address no browser opens, so it can never leave the page. */
export const DEMO_PAY = "demo-pay:";

/** The codes the demo's Adminium e-mails for a sign-in, in the order it sends them. */
export const DEMO_CODES = ["482913", "730561", "195738", "864205", "317640", "925186"] as const;

const copy = <T>(value: T): T => structuredClone(value);
const lower = (value: unknown) => String(value ?? "").trim().toLowerCase();

function refused(code: string, status: number, more: Partial<Refused> = {}): ShopError {
  return new ShopError({ code, status, column: null, child: null, index: null, reason: null, changed: null, retryAfter: null, params: {}, ...more }, code);
}

/** A refusal of the world's, as the shop's pages read one. */
function asShop(error: unknown): unknown {
  if (!(error instanceof DemoRefusal)) return error;
  if (error.status === 404) return refused("PUBLIC_REF_NOT_FOUND", 404);
  return refused(error.code === "STATE_MOVE_REFUSED" ? "PUBLIC_STATE_REFUSED" : error.code, error.status, { params: error.params, reason: typeof error.params["reason"] === "string" ? error.params["reason"] : null });
}

async function answer<T>(run: () => T): Promise<T> {
  // A moment, as an answer over the wire takes one: the screens show their waiting states as they would.
  await Promise.resolve();
  try {
    return run();
  } catch (error) {
    throw asShop(error);
  }
}

/** What a public read leaves out: the desk's own note, the link's code, the retry key, a card's whole code. */
function publicRow(row: Row): Row {
  const { staff_note: _note, link_token: _token, client_key: _key, card_code: _card, _label, ...rest } = row;
  return copy(rest) as Row;
}

/** The columns a shopper's order may carry, as the place-order doors take them. */
const ORDER_VALUES = ["name", "email", "ship_name", "address_line1", "address_line2", "city", "zip", "region_id", "offer_id", "news", "language"];

interface Composed {
  order: Row;
  lines: Row[];
  gifts: Row[];
  codes: { typed: string; code: Code }[];
  card: { row: Row; amount: number } | null;
  applied: Applied[];
  postings: Posting[];
}

export class DemoShop implements ShopPort {
  private readonly world: DemoWorld;
  readonly afterDoor: DemoAfter;

  constructor(world: DemoWorld) {
    this.world = world;
    this.afterDoor = new DemoAfter(world);
  }

  // ── the catalogue ─────────────────────────────────────────────────────────

  private onSale(): Row[] {
    return this.world.all("products").filter((p) => p["status"] === "active");
  }

  private publicVariants(): Row[] {
    return this.world.all("variants").filter((v) => v["active"] !== false && v["product_status"] === "active");
  }

  config(): Promise<ShopConfig> {
    return answer(() => ({ timezone: this.world.zone, currency: this.world.currency, now: this.world.nowIso() }));
  }

  base(): Promise<ShopBase> {
    return answer(() => {
      const w = this.world;
      const active = (table: string) => w.all(table).filter((r) => r["active"] !== false);
      return baseFrom({
        settings: [w.settings()],
        categories: w.all("categories"),
        regions: active("regions"),
        zones: w.all("zones"),
        services: active("shipping_services"),
        offers: active("shipping_offers"),
        closures: active("closures"),
        giftAmounts: active("gift_amounts"),
        sizeGuides: w.all("size_guides"),
        options: w.all("option_values").filter((o) => o["product_status"] === "active"),
      });
    });
  }

  products(query: ProductQuery): Promise<ProductPage> {
    return answer(() => {
      const variants = this.publicVariants();
      const q = lower(query.q);
      let rows = this.onSale().filter((p) => {
        if (query.categoryId !== undefined && query.categoryId !== null && !same(p["category_id"], query.categoryId)) return false;
        if (query.priceMax !== undefined && query.priceMax !== null && cents(p["price"]) > cents(query.priceMax)) return false;
        if (query.featured === true && p["featured"] !== true) return false;
        // Case folded, accents not: the engine's search (C9d).
        if (q.length >= 2 && !lower(p["name"]).includes(q) && !lower(p["category_name"]).includes(q)) return false;
        if (query.colour || query.size) {
          const one = variants.some((v) => same(v["product_id"], p.id) && (!query.colour || v["colour_code"] === query.colour) && (!query.size || v["size_code"] === query.size));
          if (!one) return false;
        }
        return true;
      });
      const tie = (a: Row, b: Row) => a.id - b.id;
      const by: Record<string, (a: Row, b: Row) => number> = {
        featured: (a, b) => n(a["position"]) - n(b["position"]) || tie(a, b),
        newest: (a, b) => String(b["created_at"] ?? "").localeCompare(String(a["created_at"] ?? "")) || tie(a, b),
        low: (a, b) => cents(a["price"]) - cents(b["price"]) || tie(a, b),
        high: (a, b) => cents(b["price"]) - cents(a["price"]) || tie(a, b),
        name: (a, b) => String(a["name"]).localeCompare(String(b["name"])) || tie(a, b),
      };
      rows = [...rows].sort(by[query.sort ?? "featured"]);
      const from = query.cursor ? Number(query.cursor) : 0;
      const limit = query.limit ?? 12;
      return {
        products: rows.slice(from, from + limit).map((p) => productOf(copy(p))),
        next: from + limit < rows.length ? String(from + limit) : null,
        count: from === 0 ? { rows: rows.length, atLeast: false } : null,
      };
    });
  }

  productBySlug(slug: string): Promise<Product | null> {
    return answer(() => {
      const row = this.onSale().find((p) => p["slug"] === slug);
      return row === undefined ? null : productOf(copy(row));
    });
  }

  detail(productId: Id): Promise<ProductDetail> {
    return answer(() => ({
      variants: this.publicVariants()
        .filter((v) => same(v["product_id"], productId))
        .map((v) => variantOf(copy(v))),
      options: this.world
        .all("option_values")
        .filter((o) => same(o["product_id"], productId))
        .map(optionOf)
        .sort((a, b) => a.position - b.position || Number(a.id) - Number(b.id)),
      pictures: [],
    }));
  }

  variantsByIds(ids: readonly Id[]): Promise<Variant[]> {
    return answer(() => this.publicVariants().filter((v) => ids.some((id) => same(id, v.id))).map((v) => variantOf(copy(v))));
  }

  variantsOf(productIds: readonly Id[]): Promise<Variant[]> {
    return answer(() => this.publicVariants().filter((v) => productIds.some((id) => same(id, v["product_id"]))).map((v) => variantOf(copy(v))));
  }

  stock(variantIds: readonly Id[]): Promise<Record<string, StockWord>> {
    return answer(() => {
      const out: Record<string, StockWord> = {};
      for (const id of variantIds) {
        const link = this.world.all(`${STOCK}links`).find((l) => same(l["source_row"], id));
        const point = link === undefined ? undefined : this.world.all(`${STOCK}stock_points`).find((p) => same(p["item_id"], link["item_id"]));
        if (point === undefined) continue;
        const state = point["state"] === "out" ? "out" : point["state"] === "low" ? "low" : "in";
        out[String(id)] = { state, left: state === "low" ? n(point["available"]) : null };
      }
      return out;
    });
  }

  reviews(productId: Id): Promise<Reviews | null> {
    return answer(() => {
      const totals = this.world.all("forms.review_totals").find((t) => same(t["about_key"], productId));
      const list = this.world
        .all("forms.reviews")
        .filter((r) => r["state"] === "published" && same(r["about_key"], productId))
        .sort((a, b) => String(b["submitted_at"]).localeCompare(String(a["submitted_at"])))
        .slice(0, 20);
      return {
        count: n(totals?.["count"]),
        sum: n(totals?.["sum"]),
        bars: [5, 4, 3, 2, 1].map((s) => n(totals?.[`c${String(s)}`])) as Reviews["bars"],
        list: list.map((r) => ({ id: r.id, stars: n(r["stars"]), title: (r["title"] as string | null) ?? null, body: (r["body"] as string | null) ?? null, name: (r["shown_name"] as string | null) ?? null, at: (r["submitted_at"] as string | null) ?? null })),
      };
    });
  }

  // ── an order ──────────────────────────────────────────────────────────────

  /**
   * The order as the save would write it, kept apart from the world: every
   * figure, the codes' shares, a gift card's part, and what each ledger
   * says. Refused the way the place-order doors refuse it.
   */
  private compose(kind: OrderKind, pay: PayMethod, body: OrderBody): Composed {
    const w = this.world;
    const signedIn = this.afterDoor.customerId();
    if (pay === "transfer" && signedIn === null) throw refused("PUBLIC_REF_NOT_FOUND", 404);
    if (pay === "transfer" && w.settings()["transfer_on"] === false) throw refused("PUBLIC_SWITCHED_OFF", 403);
    const values = Object.fromEntries(Object.entries(body.values).filter(([k]) => ORDER_VALUES.includes(k)));
    const order: Row = { id: 0, ...values, kind, pay_method: pay, status: pay === "online" ? "paying" : "awaiting_transfer", customer_id: signedIn, customer_proved: signedIn !== null, placed_at: w.nowIso(), discount: null };
    if (kind === "goods") {
      const region = w.get("regions", order["region_id"]);
      if (region === undefined || region["active"] === false) throw refused("PUBLIC_WRITE_REFUSED", 400, { column: "region_id", reason: "required" });
      const offer = w.get("shipping_offers", order["offer_id"]);
      if (offer === undefined || offer["active"] === false || !same(offer["zone_id"], region["zone_id"])) throw refused("PUBLIC_WRITE_REFUSED", 400, { column: "offer_id", reason: "not-offered" });
    } else {
      for (const k of ["ship_name", "address_line1", "address_line2", "city", "zip", "region_id", "offer_id"]) delete order[k];
    }
    freezeOrder(order, w.tables);
    const lines = (kind === "goods" ? (body.children.order_lines ?? []) : []).map(({ values: lv }, i): Row => {
      const v = w.get("variants", lv.variant_id);
      if (v === undefined || v["active"] === false || v["sold_out"] === true || v["product_status"] !== "active") throw refused("PUBLIC_WRITE_REFUSED", 400, { child: "order_lines", index: i, column: "variant_id", reason: "not-linkable" });
      const qty = Number(lv.qty);
      if (!Number.isInteger(qty) || qty < 1 || qty > 10) throw refused("PUBLIC_WRITE_REFUSED", 400, { child: "order_lines", index: i, column: "qty", reason: "range" });
      const line: Row = { id: -(i + 1), order_id: 0, variant_id: v.id, qty };
      freezeLine(line, w.tables);
      deriveLine(line, order, []);
      return line;
    });
    if (kind === "goods" && lines.length === 0) throw refused("PUBLIC_WRITE_REFUSED", 400, { child: "order_lines", reason: "required" });
    const gifts = (body.children.gift_lines ?? []).map(({ values: gv }, i): Row => {
      const amount = w.get("gift_amounts", gv.amount_id);
      if (amount === undefined || amount["active"] === false) throw refused("PUBLIC_WRITE_REFUSED", 400, { child: "gift_lines", index: i, column: "amount_id", reason: "not-linkable" });
      const gift: Row = { id: -(i + 1), order_id: 0, amount_id: amount.id, to_name: gv.to_name ?? null, to_email: gv.to_email, message: gv.message ?? null };
      freezeGift(gift, order, w.tables);
      return gift;
    });
    // Offers: each typed code taken, or refused with its reason.
    const codes = (body.children.order_codes ?? []).map(({ values: cv }, i) => {
      const typed = String(cv.typed).trim().toUpperCase();
      const code = w.offerCodes[typed];
      const reason = codeRefusal(code, {
        day: w.today(),
        signedIn: signedIn !== null,
        firstOrder: signedIn !== null && w.firstOrder(signedIn),
        lineCategories: lines.map((l) => w.categorySlug(l["category_id"]) ?? ""),
      });
      if (reason !== null || code === undefined) throw refused("PUBLIC_WRITE_REFUSED", 400, { child: "order_codes", index: i, column: "typed", reason: reason ?? "unknown" });
      return { typed, code };
    });
    const applied: Applied[] = [];
    if (codes.length > 0) {
      const shares = lineDiscounts(lines, codes.map((c) => c.code), (line) => w.categorySlug(line["category_id"]));
      lines.forEach((line, i) => {
        line["discount"] = money(shares[i] ?? 0);
      });
      order["discount"] = money(shares.reduce((a, b) => a + b, 0));
      for (const { code } of codes) {
        const off = lineDiscounts(lines, [code], (line) => w.categorySlug(line["category_id"])).reduce((a, b) => a + b, 0);
        applied.push({ line: null, name: code.label, kind: "code", amount: money(off), typed: true });
      }
    }
    deriveOrderMoney(order, lines, gifts, [], []);
    // A gift card pays the goods, never another gift card.
    let card: Composed["card"] = null;
    const typedCard = body.children.payments?.[0]?.values.card_code;
    if (typedCard !== undefined) {
      const row = w.giftCardByCode(typedCard);
      if (row === undefined || row["status"] !== "active" || cents(row["balance"]) <= 0) throw refused("PUBLIC_CARD_REFUSED", 409, { child: "payments", index: 0, reason: "not-valid" });
      const amount = Math.min(cents(row["balance"]), cents(order["due_goods"]));
      card = { row, amount };
      deriveOrderMoney(order, lines, gifts, [{ id: 0, kept: money(amount), paid_at: w.nowIso() }], []);
      order["paid_at"] = null;
    }
    stampPlaced(order, w.settings(), closuresIn(w.tables));
    // Inventory: each line's pieces held, or refused when not that many are left.
    const postings: Posting[] = lines.flatMap((line, i): Posting[] => {
      const left = w.available(line["variant_id"]);
      if (left === null || left >= n(line["qty"])) return [];
      return [{ ledger: "stock", state: "refused", reason: "out-of-stock", line: i, path: ["order_lines", i], ...(left > 0 ? { left: String(left) } : {}) }];
    });
    return { order, lines, gifts, codes, card, applied, postings };
  }

  quote(kind: OrderKind, pay: PayMethod, body: OrderBody): Promise<Quote> {
    return answer(() => {
      const made = this.compose(kind, pay, body);
      return {
        order: publicRow(made.order),
        lines: made.lines.map(publicRow),
        gifts: made.gifts.map(publicRow),
        applied: made.applied,
        postings: made.postings,
        payment: made.card === null ? null : { amount: money(made.card.amount), due: String(made.order["due"]) },
      };
    });
  }

  place(kind: OrderKind, pay: PayMethod, body: OrderBody, clientKey: string, expectTotal: string): Promise<Placed> {
    return answer((): Placed => {
      const w = this.world;
      const again = w.all("orders").find((o) => o["client_key"] === clientKey);
      if (again !== undefined) return this.placed(again, true);
      const made = this.compose(kind, pay, body);
      const short = made.postings.find((p) => p.state === "refused");
      if (short !== undefined) throw refused("PUBLIC_OUT_OF_STOCK", 409, { child: "order_lines", index: short.line ?? null, params: short.left === undefined ? {} : { left: short.left } });
      if (made.order["total"] !== expectTotal) throw refused("PUBLIC_PRICE_CHANGED", 409, { changed: { total: String(made.order["total"]), lines: made.lines.map(publicRow) } });
      const { seq, number } = w.nextNumber();
      const { id: _id, ...values } = made.order;
      const order = w.insert("orders", { ...values, number_seq: seq, number, client_key: clientKey });
      order["link_token"] = w.linkToken(order.id);
      if (pay === "transfer") {
        const s = w.settings();
        order["transfer_note"] = [s["transfer_name"], s["transfer_bank"], `Routing ${String(s["transfer_routing"])}`, `Account ${String(s["transfer_account"])}`, `Reference ${number}`].join("\n");
      }
      for (const line of made.lines) {
        const { id: _l, ...rest } = line;
        w.insert("order_lines", { ...rest, order_id: order.id });
      }
      for (const gift of made.gifts) {
        const { id: _g, ...rest } = gift;
        w.insert("gift_lines", { ...rest, order_id: order.id });
      }
      for (const c of made.codes) w.insert("order_codes", { order_id: order.id, typed: c.typed, code_id: c.typed, voucher_id: null, removed_at: null });
      if (made.card !== null && made.card.amount > 0) {
        const after = cents(made.card.row["balance"]) - made.card.amount;
        made.card.row["balance"] = money(after);
        w.insert("payments", { order_id: order.id, method: "gift_card", card_id: made.card.row.id, card_last4: made.card.row["last4"], amount: money(made.card.amount), card_balance_after: money(after), paid_at: w.nowIso(), made_by: "customer" });
      }
      w.changed();
      if (pay === "transfer") w.mail("order-transfer", { to: order["email"], orderId: order.id, language: order["language"] });
      if (cents(order["due"]) <= 0 && ["paying", "awaiting_transfer"].includes(String(order["status"]))) {
        w.moveOrder(order.id, String(order["status"]), "paid", {}, CUSTOMER);
        if (order["kind"] === "gift") w.sendCards(order);
      }
      // The order's own link, a session on it already open: its page needs no claim.
      this.afterDoor.holdLink(order.id);
      return this.placed(order, false);
    });
  }

  private placed(order: Row, replayed: boolean): Placed {
    const w = this.world;
    const lines = w.all("order_lines").filter((l) => same(l["order_id"], order.id));
    const gifts = w.all("gift_lines").filter((g) => same(g["order_id"], order.id));
    const card = w.all("payments").find((p) => same(p["order_id"], order.id) && p["method"] === "gift_card");
    const codes = w.all("order_codes").filter((c) => same(c["order_id"], order.id));
    const applied: Applied[] = codes.flatMap((c): Applied[] => {
      const code = w.offerCodes[String(c["typed"])];
      if (code === undefined) return [];
      const off = lineDiscounts(lines, [code], (line) => w.categorySlug(line["category_id"])).reduce((a, b) => a + b, 0);
      return [{ line: null, name: code.label, kind: "code", amount: money(off), typed: true }];
    });
    const online = order["pay_method"] === "online";
    return {
      order: publicRow(order),
      lines: lines.map(publicRow),
      gifts: gifts.map(publicRow),
      applied,
      postings: [],
      payment: card === undefined ? null : { amount: String(card["amount"]), due: String(order["due"]) },
      replayed,
      link: { token: String(order["link_token"]) },
      payUrl: online && order["status"] === "paying" && cents(order["due"]) > 0 ? `${DEMO_PAY}${String(order.id)}` : null,
    };
  }

  payments(): ShopPayments {
    const w = this.world;
    return {
      available: async () => ({ online: true, test: false }),
      start: (_via, orderId) =>
        answer(() => {
          const order = w.get("orders", orderId);
          if (order === undefined) throw refused("PUBLIC_REF_NOT_FOUND", 404);
          if (order["status"] !== "paying" || Date.parse(String(order["pay_by"])) <= w.now) throw refused("PUBLIC_PAY_REFUSED", 409);
          w.payStates.set(String(order.id), "open");
          return `${DEMO_PAY}${String(order.id)}`;
        }),
      state: (_via, orderId) =>
        answer((): PayState => {
          const order = w.get("orders", orderId);
          if (order === undefined) throw refused("PUBLIC_REF_NOT_FOUND", 404);
          if (["paid", "packed", "shipped", "sent"].includes(String(order["status"]))) return "paid";
          return w.payStates.get(String(order.id)) ?? "none";
        }),
    };
  }

  // ── the other doors ───────────────────────────────────────────────────────

  restock(variantId: Id): Promise<void> {
    return answer(() => {
      const w = this.world;
      const who = this.afterDoor.customerId();
      if (who === null) throw refused("PUBLIC_SIGN_IN_REQUIRED", 401);
      if (w.all("restock_requests").some((r) => same(r["variant_id"], variantId) && same(r["customer_id"], who) && !set(r["notified_at"]))) throw refused("PUBLIC_UNIQUE", 409);
      w.insert("restock_requests", { variant_id: variantId, customer_id: who, language: document.documentElement.lang || "en-US", asked_at: w.nowIso(), notified_at: null });
      w.changed();
    });
  }

  newsSignup(email: string, language: string, clientKey: string): Promise<void> {
    return answer(() => {
      const w = this.world;
      let customer = w.customerByEmail(email);
      if (customer === undefined) customer = w.insert("customers", { email: lower(email), name: null, language, news: true, news_since: w.nowIso(), created_at: w.nowIso() });
      else if (customer["news"] !== true) Object.assign(customer, { news: true, news_since: w.nowIso() });
      w.insert("news_signups", { email: lower(email), language, news: true, customer_id: customer.id, client_key: clientKey, created_at: w.nowIso() });
      w.changed();
      w.mail("news-welcome", { to: lower(email), customerId: customer.id, language });
    });
  }

  enquiry(values: Row, clientKey: string): Promise<void> {
    return answer(() => {
      const w = this.world;
      w.insert("enquiries", { ...values, status: "new", client_key: clientKey, created_at: w.nowIso() });
      w.changed();
      w.mail("staff-enquiry", { to: w.settings()["email"] });
    });
  }

  giftCard(code: string): Promise<{ balance: string; status: string; expiresOn: string | null } | null> {
    return answer(() => {
      const card = this.world.giftCardByCode(code);
      return card === undefined ? null : { balance: String(card["balance"]), status: String(card["status"]), expiresOn: (card["expires_on"] as string | null) ?? null };
    });
  }

  features(): ShopFeatures {
    const on = (key: string) => this.world.addOns.has(key);
    return { forms: on("forms"), offers: on("offers"), inventory: on("inventory") };
  }

  after(): AfterPort {
    return this.afterDoor;
  }
}

/**
 * The pages after an order, over the demo's world: the e-mail sign-in (the
 * code "e-mailed" is the demo's next one, and the card types it), the
 * signed-in customer's own orders and returns, and an order's own link.
 */
export class DemoAfter implements AfterPort {
  private readonly world: DemoWorld;
  private session: number | null = null;
  private linkOrder: number | null = null;
  private tries = 5;
  private issued = 0;

  constructor(world: DemoWorld) {
    this.world = world;
  }

  /** The signed-in customer's key, or null for a guest. */
  customerId(): number | null {
    return this.session;
  }

  /** For the demo card: sign a customer in, as a code typed back would. */
  signInAs(email: string): void {
    const who = this.world.customerByEmail(email);
    if (who !== undefined) this.session = who.id;
  }

  /** Placing an order opens a session on its own link, as Adminium's answer does. */
  holdLink(orderId: number): void {
    this.linkOrder = orderId;
  }

  /** The code the demo last "e-mailed" to an address, for the card to type; null before one was asked. */
  codeFor(email: string): string | null {
    return this.world.codes.get(lower(email))?.at(-1) ?? null;
  }

  private read(via: Via, order: Row): OrderRead {
    const w = this.world;
    const returns = w.all("returns").filter((r) => same(r["order_id"], order.id));
    return {
      via,
      order: publicRow(order),
      lines: w.all("order_lines").filter((l) => same(l["order_id"], order.id)).map(publicRow),
      gifts: w.all("gift_lines").filter((g) => same(g["order_id"], order.id)).map(publicRow),
      payments: w.all("payments").filter((p) => same(p["order_id"], order.id)).map(publicRow),
      refunds: w.all("payment_refunds").filter((r) => same(r["order_id"], order.id)).map(publicRow),
      returns: returns.map(publicRow),
      returnLines: w.all("return_lines").filter((l) => returns.some((r) => same(r.id, l["return_id"]))).map(publicRow),
    };
  }

  private mine(): Row[] {
    if (this.session === null) return [];
    return this.world.all("orders").filter((o) => same(o["customer_id"], this.session));
  }

  private reachable(via: Via, orderId: Id): Row {
    const order = via === "link" ? (same(orderId, this.linkOrder) ? this.world.get("orders", orderId) : undefined) : this.mine().find((o) => same(o.id, orderId));
    if (order === undefined) throw refused("PUBLIC_REF_NOT_FOUND", 404);
    return order;
  }

  requestCode(email: string, _language: string): Promise<void> {
    return answer(() => {
      const code = DEMO_CODES[this.issued % DEMO_CODES.length]!;
      this.issued += 1;
      this.tries = 5;
      const key = lower(email);
      this.world.codes.set(key, [...(this.world.codes.get(key) ?? []), code]);
    });
  }

  verifyCode(email: string, code: string): Promise<CodeAnswer> {
    return answer((): CodeAnswer => {
      const key = lower(email);
      if (this.tries <= 0) return { ok: false, reason: "locked" };
      if (this.codeFor(key) !== code.trim()) {
        this.tries -= 1;
        return this.tries > 0 ? { ok: false, reason: "wrong", triesLeft: this.tries } : { ok: false, reason: "spent" };
      }
      const w = this.world;
      // The mailbox is proved: the customer it belongs to, or a new one with that address.
      const who = w.customerByEmail(key) ?? w.insert("customers", { email: key, name: null, language: document.documentElement.lang || "en-US", news: false, created_at: w.nowIso() });
      this.session = who.id;
      w.codes.set(key, []);
      w.changed();
      return { ok: true };
    });
  }

  async peekSignInLink(_token: string): Promise<string | null> {
    return null;
  }

  async openSignInLink(_token: string): Promise<boolean> {
    return false;
  }

  signedIn(): boolean {
    return this.session !== null;
  }

  async signOut(): Promise<void> {
    this.session = null;
  }

  forgetMe(): Promise<void> {
    return answer(() => {
      const me = this.world.get("customers", this.session);
      if (me !== undefined) Object.assign(me, { name: null, email: null, news: false, forgotten_at: this.world.nowIso() });
      this.session = null;
      this.world.changed();
    });
  }

  me(): Promise<Me | null> {
    return answer((): Me | null => {
      const row = this.world.get("customers", this.session);
      return row === undefined ? null : { id: row.id, name: String(row["name"] ?? ""), email: String(row["email"] ?? ""), news: row["news"] === true, language: (row["language"] as string | null) ?? null };
    });
  }

  stopNews(me: Me): Promise<void> {
    return answer(() => {
      const row = this.world.get("customers", me.id);
      if (row === undefined || !same(row.id, this.session)) throw refused("PUBLIC_REF_NOT_FOUND", 404);
      row["news"] = false;
      this.world.changed();
    });
  }

  myOrders(): Promise<Row[]> {
    return answer(() => this.mine().sort((a, b) => String(b["placed_at"]).localeCompare(String(a["placed_at"])) || b.id - a.id).map(publicRow));
  }

  myReturns(): Promise<Row[]> {
    return answer(() => {
      const ids = this.mine().map((o) => o.id);
      return this.world
        .all("returns")
        .filter((r) => ids.some((id) => same(id, r["order_id"])))
        .sort((a, b) => String(b["asked_at"]).localeCompare(String(a["asked_at"])))
        .map(publicRow);
    });
  }

  readMine(orderId: Id): Promise<OrderRead | null> {
    return answer(() => {
      const order = this.mine().find((o) => same(o.id, orderId));
      return order === undefined ? null : this.read("mine", order);
    });
  }

  openShared(token: string): Promise<"opened" | "unknown" | "closed"> {
    return answer(() => {
      const order = this.world.all("orders").find((o) => o["link_token"] === token);
      if (order === undefined) return "unknown";
      if (order["link_stopped"] === true || Date.parse(String(order["link_expires"] ?? "")) <= this.world.now) return "closed";
      this.linkOrder = order.id;
      return "opened";
    });
  }

  sharedHeld(): boolean {
    return this.linkOrder !== null;
  }

  readShared(): Promise<OrderRead | null> {
    return answer(() => {
      const order = this.world.get("orders", this.linkOrder);
      return order === undefined ? null : this.read("link", order);
    });
  }

  cancel(via: Via, orderId: Id): Promise<Row> {
    return answer(() => {
      const order = this.reachable(via, orderId);
      if (!["paid", "awaiting_transfer"].includes(String(order["status"]))) throw refused("PUBLIC_STATE_REFUSED", 409);
      return publicRow(this.world.moveOrder(order.id, String(order["status"]), "cancelled", { cancel_reason: "customer" }, CUSTOMER));
    });
  }

  newLink(orderId: Id): Promise<void> {
    return answer(() => {
      const order = this.reachable("mine", orderId);
      order["link_token"] = this.world.linkToken(order.id);
      this.world.changed();
      this.world.mail("order-paid", { to: order["email"], orderId: order.id, language: order["language"] });
    });
  }

  askReturn(via: Via, ask: ReturnAsk): Promise<Row> {
    return answer(() => {
      const w = this.world;
      const order = this.reachable(via, ask.orderId);
      if (order["status"] !== "shipped") throw refused("PUBLIC_WRITE_REFUSED", 400, { column: "order_id", reason: "not-linkable" });
      const again = w.all("returns").find((r) => r["client_key"] === ask.clientKey);
      if (again !== undefined) return publicRow(again);
      const lines = w.all("order_lines").filter((l) => same(l["order_id"], order.id));
      ask.lines.forEach((pick, i) => {
        const line = byId(lines, pick.lineId);
        if (line === undefined || pick.qty < 1 || pick.qty > n(line["returnable"])) throw refused("PUBLIC_WRITE_REFUSED", 400, { child: "return_lines", index: i, column: "qty", reason: "range" });
      });
      const number = w.nextReturnNumber();
      const ret = w.insert("returns", { number, number_seq: Number(number.replace(/\D/g, "")), order_id: order.id, customer_id: via === "mine" ? this.session : null, client_key: ask.clientKey, status: "asked", reason: ask.reason, note: ask.note.trim() === "" ? null : ask.note.trim(), tracking: null, staff_reason: null, staff_note: null, shipping_refund: null, asked_at: w.nowIso() });
      for (const pick of ask.lines) w.insert("return_lines", { return_id: ret.id, line_id: pick.lineId, qty: pick.qty, restock: true, void_at: null });
      w.changed();
      w.mail("return-asked", { to: order["email"], orderId: order.id, returnId: ret.id, language: order["language"] });
      w.mail("staff-return", { to: w.settings()["email"], orderId: order.id, returnId: ret.id });
      return publicRow(ret);
    });
  }

  private lineOf(via: Via, lineId: Id): Row {
    const line = this.world.get("order_lines", lineId);
    if (line === undefined) throw refused("PUBLIC_REF_NOT_FOUND", 404);
    this.reachable(via, line["order_id"] as Id);
    return line;
  }

  reviewState(via: Via, lineId: Id): Promise<ReviewState | null> {
    return answer((): ReviewState | null => {
      if (!this.world.addOns.has("forms")) return null;
      const line = this.lineOf(via, lineId);
      const order = this.world.get("orders", line["order_id"]);
      const at = (line["reviewed_at"] as string | null | undefined) ?? null;
      return { open: order?.["status"] === "shipped" && at === null, reviewedAt: at };
    });
  }

  sendReview(via: Via, lineId: Id, values: ReviewValues): Promise<{ reviewedAt: string | null }> {
    return answer(() => {
      const w = this.world;
      const line = this.lineOf(via, lineId);
      if (set(line["reviewed_at"])) throw refused("PUBLIC_UNIQUE", 409);
      const order = w.get("orders", line["order_id"]);
      const name = String(order?.["name"] ?? "").trim().split(/\s+/);
      w.insert("forms.reviews", {
        app: "ecommerce-shop",
        subject_table: "order_lines",
        subject_key: String(line.id),
        about_table: "products",
        about_key: String(line["product_id"]),
        about_name: line["product_name"],
        about_detail: line["variant_label"],
        stars: values.stars,
        title: values.title ?? null,
        body: values.body,
        shown_name: name.length > 1 ? `${name[0]!} ${name.at(-1)!.charAt(0)}.` : (name[0] ?? null),
        state: "waiting",
        hide_reason: null,
        reply: null,
        submitted_at: w.nowIso(),
      });
      line["reviewed_at"] = w.nowIso();
      w.changed();
      return { reviewedAt: line["reviewed_at"] as string };
    });
  }

  /** No documents door in the demo: Invoices' receipt is drawn by Adminium, which the page does not hold. */
  async receipt(_via: Via, _orderId: Id): Promise<Receipt | null> {
    return null;
  }

  productsByIds(ids: readonly Id[]): Promise<Product[]> {
    return answer(() => this.world.all("products").filter((p) => ids.some((id) => same(id, p.id))).map((p) => productOf(copy(p))));
  }
}
