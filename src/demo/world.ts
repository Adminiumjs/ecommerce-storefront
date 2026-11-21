/**
 * The demo's Adminium for Northline, in the page: the sample's rows, held in
 * memory and worked by the manifest's rules (`rules.ts`), a clock that stands
 * on Tuesday 18 August 2026 at 11:40 in Portland until the demo card moves
 * it, and Inventory, Offers, Forms and Invoices switched on. The shop's door
 * (`shop.ts`) and the desk's (`desk.ts`) both read and write this one world,
 * so an order placed in the shop is on the desk the moment it is placed.
 *
 * MOVING THE CLOCK MOVES THE DATA (BN-14). "+1 business day" runs what
 * Adminium's clock would have run meanwhile: an order still being paid past
 * its 30 minutes is cancelled "because it wasn't paid in time" and its stock
 * let go; a bank transfer past its last day the same; a code past its last
 * day stops; every date a new order is told counts from the new day. Dates
 * Adminium already stamped on a row stay as they were.
 *
 * The sample's orders carry their own numbers (NL-1001 to NL-1066) and no
 * running number, so the first order placed here is NL-1067, as the
 * settings' `first_number` says.
 *
 * DEMO BUILD ONLY — nothing in a real build imports it.
 */
import WORLD from "../sample/northline-data.json";

import { dayIn, momentOf } from "../desk/time.ts";
import { addWorkingDays, byId, cents, closuresIn, COUNTED, deriveAll, lineDiscounts, money, n, nextBusinessDay, same, set, wallTime, type Code } from "./rules.ts";
import { DEMO_START, DEMO_ZONE, sampleTables, STOCK, type Row, type Tables } from "./sample.ts";

/** A refusal the world makes, as Adminium would: each door says it in its own error. */
export class DemoRefusal extends Error {
  readonly status: number;
  readonly code: string;
  readonly params: Record<string, unknown>;
  constructor(status: number, code: string, message: string, params: Record<string, unknown> = {}) {
    super(message);
    this.name = "DemoRefusal";
    this.status = status;
    this.code = code;
    this.params = params;
  }
}

/** The add-ons Northline's demo runs with: what its install ticks, and DHL's demo carrier (C4). */
export const DEMO_ADD_ONS = ["inventory", "offers", "invoices", "forms", "shipping-dhl"] as const;

/** Tables the sample adds no rows to, which the screens still read or write. */
const EMPTY = ["product_pictures", "order_codes", "gift_lines", "payment_refunds", "returns", "return_lines", "messages", "news_signups", "enquiries", "restock_requests", `${STOCK}movements`];

/** Where an order may go from each state, as its table's `states` say. */
export const ORDER_MOVES: Readonly<Record<string, readonly string[]>> = {
  paying: ["paid", "cancelled"],
  awaiting_transfer: ["paid", "cancelled"],
  paid: ["packed", "sent", "cancelled"],
  packed: ["shipped", "paid"],
  sent: ["cancelled"],
};
export const RETURN_MOVES: Readonly<Record<string, readonly string[]>> = {
  asked: ["approved", "declined"],
  approved: ["received", "declined"],
  received: ["refunded"],
};

/** Who writes: the shopper through a public door, or the person signed in to the desk. */
export interface By {
  origin: "public" | "staff";
  name: string | null;
}
export const CUSTOMER: By = { origin: "public", name: null };

/** A link code nobody guesses: counted, never drawn at random, so a test reads the same one. */
const linkCode = (seed: number): string => {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  // A 32-bit mix of the seed, in integers only: each seed its own code.
  let x = Math.imul(seed ^ 0x5bd1e995, 0x9e3779b1) >>> 0;
  let out = "";
  for (let i = 0; i < 16; i += 1) {
    x = (Math.imul(x ^ (x >>> 15), 0x2c1b3c6d) + i) >>> 0;
    out += abc[x % abc.length];
  }
  return out;
};

/** The sample's gift cards' whole codes: the sample keeps their last four only, as Offers shows them. */
const CARD_CODES: Record<string, string> = { M4TD: "K2PX9QWAM4TD", "7Q2K": "H8WD3RTM7Q2K", X9PB: "T6RNB4LCX9PB" };

export class DemoWorld {
  now: number;
  readonly zone = DEMO_ZONE;
  readonly currency = "USD";
  readonly tables: Tables;
  readonly addOns: Set<string>;
  /** How each order's online payment stands at the pay page, by order id: "none" until the shopper goes there. */
  readonly payStates = new Map<string, "open" | "confirming" | "paid" | "failed">();
  /** The codes "e-mailed" to an address, newest last: the demo has no post office, so the card types them. */
  readonly codes = new Map<string, string[]>();
  /** Offers' codes, by what a shopper types. */
  readonly offerCodes: Record<string, Code>;
  private readonly listeners = new Set<() => void>();
  private serial = 0;

  constructor(start = DEMO_START) {
    this.now = start;
    this.tables = sampleTables(start, dayIn(start, DEMO_ZONE));
    for (const table of EMPTY) this.tables[table] ??= [];
    this.addOns = new Set(DEMO_ADD_ONS);
    this.offerCodes = Object.fromEntries(Object.entries(WORLD.CODES).map(([code, c]) => [code, { percent: c.percent, on: c.on, label: c.label, until: c.until, guests: c.guests, firstOrder: c.firstOrder }]));
    for (const order of this.all("orders")) order["link_token"] ??= linkCode(order.id);
    this.tables["offers.gift_cards"] = WORLD.GIFT_CARDS.map((g, i) => ({
      id: i + 1,
      code: CARD_CODES[g.code_last4] ?? `NLGIFT00${g.code_last4}`,
      last4: g.code_last4,
      amount: g.amount,
      balance: g.balance,
      status: "active",
      expires_on: null,
      to_name: g.to,
      order_id: this.orderByNumber(g.order)?.id ?? null,
    }));
    this.tables["forms.reviews"] = this.sampleReviews();
    deriveAll(this.tables, this.now);
    // Offers decided each code's share when the sample's orders were written: worked out once, then kept.
    for (const order of this.all("orders")) this.applyCodes(order, this.all("order_lines").filter((l) => same(l["order_id"], order.id)));
    deriveAll(this.tables, this.now);
  }

  // ── reading ───────────────────────────────────────────────────────────────

  all(table: string): Row[] {
    return (this.tables[table] ??= []);
  }

  get(table: string, id: unknown): Row | undefined {
    return byId(this.all(table), id);
  }

  settings(): Row {
    return this.all("settings")[0] ?? { id: 1 };
  }

  orderByNumber(number: string): Row | undefined {
    return this.all("orders").find((o) => o["number"] === number);
  }

  customerByEmail(email: string): Row | undefined {
    const e = email.trim().toLowerCase();
    return this.all("customers").find((c) => String(c["email"] ?? "").toLowerCase() === e);
  }

  /** The shop's day and wall time now. */
  today(): string {
    return dayIn(this.now, this.zone);
  }

  wallTime(): string {
    return wallTime(this.now, this.zone);
  }

  nowIso(): string {
    return new Date(this.now).toISOString();
  }

  // ── writing ───────────────────────────────────────────────────────────────

  insert(table: string, values: Record<string, unknown>): Row {
    const id = Math.max(0, ...this.all(table).map((r) => r.id)) + 1;
    const row = { ...values, id } as Row;
    this.all(table).push(row);
    return row;
  }

  update(table: string, id: unknown, values: Record<string, unknown>): Row {
    const row = this.get(table, id);
    if (row === undefined) throw new DemoRefusal(404, "NOT_FOUND", `No such ${table} row.`);
    Object.assign(row, values);
    return row;
  }

  remove(table: string, id: unknown): void {
    this.tables[table] = this.all(table).filter((r) => !same(r.id, id));
  }

  /** After a write: every stored figure again, then whoever is watching. */
  changed(): void {
    deriveAll(this.tables, this.now);
    for (const listener of this.listeners) listener();
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  }

  /** A code nobody else has: counted, never drawn at random. */
  code(prefix: string, length = 16): string {
    this.serial += 1;
    return `${prefix}${String(this.serial).padStart(Math.max(1, length - prefix.length), "0")}`.slice(0, length);
  }

  /** An e-mail the outbox sent: the demo sends nothing, and writes down what Adminium would have sent. */
  mail(kind: string, values: { to: unknown; orderId?: unknown; returnId?: unknown; customerId?: unknown; requestId?: unknown; language?: unknown }): void {
    if (!set(values.to)) return;
    this.insert("messages", {
      kind,
      status: "sent",
      to_address: values.to,
      language: values.language ?? "en-US",
      order_id: values.orderId ?? null,
      return_id: values.returnId ?? null,
      customer_id: values.customerId ?? null,
      request_id: values.requestId ?? null,
      created_at: this.nowIso(),
      sent_at: this.nowIso(),
      due: null,
      error: null,
    });
  }

  // ── Offers ────────────────────────────────────────────────────────────────

  /** The codes on an order, as Offers takes them: each line's share, and the order's sum. */
  applyCodes(order: Row, lines: readonly Row[]): void {
    const typed = this.all("order_codes").filter((c) => same(c["order_id"], order.id) && !set(c["removed_at"]));
    if (typed.length === 0) return;
    const codes = typed.map((c) => this.offerCodes[String(c["typed"]).toUpperCase()]).filter((c): c is Code => c !== undefined);
    const shares = lineDiscounts(lines, codes, (line) => this.categorySlug(line["category_id"]));
    lines.forEach((line, i) => {
      line["discount"] = money(shares[i] ?? 0);
    });
    order["discount"] = money(shares.reduce((a, b) => a + b, 0));
  }

  categorySlug(categoryId: unknown): string | null {
    const slug = this.get("categories", categoryId)?.["slug"];
    return typeof slug === "string" ? slug : null;
  }

  /** Whether a signed-in customer's next order is their first one made (WELCOME10). */
  firstOrder(customerId: unknown): boolean {
    return !this.all("orders").some((o) => same(o["customer_id"], customerId) && COUNTED.includes(String(o["status"])));
  }

  giftCardByCode(code: string): Row | undefined {
    const c = code.trim().toUpperCase().replace(/[\s-]/g, "");
    return this.all("offers.gift_cards").find((g) => g["code"] === c);
  }

  // ── numbers ───────────────────────────────────────────────────────────────

  /** The order number the next order takes: the settings' first number, then one past the last given. */
  nextNumber(): { seq: number; number: string } {
    const first = Number(this.settings()["first_number"] ?? 1001);
    const given = this.all("orders").map((o) => Number(o["number_seq"])).filter((x) => Number.isFinite(x) && x > 0);
    const seq = given.length === 0 ? first : Math.max(...given) + 1;
    return { seq, number: `${String(this.settings()["ref_prefix"] ?? "NL-")}${String(seq)}` };
  }

  nextReturnNumber(): string {
    const top = Math.max(1000, ...this.all("returns").map((r) => Number(String(r["number"] ?? "").replace(/\D/g, ""))).filter((x) => Number.isFinite(x)));
    return `RT-${String(top + 1)}`;
  }

  linkToken(orderId: number): string {
    return linkCode(orderId + 7919 * (this.serial + 1));
  }

  // ── orders along their states ─────────────────────────────────────────────

  /**
   * An order moved from the state the screen saw, as its table's states
   * allow and require, with the stamps and the ledgers' answers the move
   * makes: stock taken on Packed, let go on a cancel; an online payment given
   * back by itself on the shop's cancel; a gift card recalled, refused once
   * spent; the e-mail the move sends.
   */
  moveOrder(id: unknown, from: string | null, to: string, values: Record<string, unknown>, by: By): Row {
    const order = this.get("orders", id);
    if (order === undefined) throw new DemoRefusal(404, "NOT_FOUND", "No such order.");
    const now = String(order["status"]);
    if (from !== null && now !== from) throw new DemoRefusal(409, "STATE_MOVE_REFUSED", "It moved on.", { from: now, to });
    if (!(ORDER_MOVES[now] ?? []).includes(to)) throw new DemoRefusal(409, "STATE_MOVE_REFUSED", "Not a move an order makes.", { from: now, to });
    const after = { ...order, ...values };
    const refuse = (why: string) => new DemoRefusal(409, "STATE_MOVE_REFUSED", why, { from: now, to });
    if (to === "paid" && cents(order["due"]) > 0) throw refuse("Not paid yet.");
    if (to === "packed" && order["kind"] !== "goods") throw refuse("Nothing to pack.");
    if (to === "sent" && order["kind"] !== "gift") throw refuse("Goods are shipped, not sent.");
    if (to === "shipped" && !set(after["carrier"])) throw refuse("A carrier first.");
    if (to === "cancelled" && now === "paying" && Date.parse(String(order["pay_by"])) > this.now) throw refuse("It is being paid.");
    if (to === "cancelled" && !set(after["cancel_reason"])) throw refuse("A reason first.");
    const lines = this.all("order_lines").filter((l) => same(l["order_id"], order.id));
    const stamp = this.nowIso();
    if (to === "cancelled" && now === "sent") this.recallCards(order);
    Object.assign(order, values, { status: to });
    if (to === "packed") {
      Object.assign(order, { packed_at: stamp, packed_by: by.name });
      // Inventory takes the held pieces off the shelf.
      for (const line of lines) this.stockMove(line["variant_id"], -n(line["qty"]), "taken");
    }
    if (to === "paid" && now === "packed") {
      Object.assign(order, { packed_at: null, packed_by: null });
      for (const line of lines) this.stockMove(line["variant_id"], n(line["qty"]), "unpacked");
    }
    if (to === "shipped" || to === "sent") Object.assign(order, { shipped_at: stamp, shipped_by: to === "shipped" ? by.name : null });
    if (to === "cancelled") {
      Object.assign(order, { cancelled_at: stamp, cancelled_by: by.origin === "public" ? "customer" : by.name });
      if (now !== "paying" && now !== "awaiting_transfer") this.giveBack(order, by);
    }
    this.changed();
    this.mailFor(order, to, now);
    return order;
  }

  /** Every payment an order still keeps, given back the way it came (Adminium's own on a cancel). */
  private giveBack(order: Row, by: By): void {
    for (const payment of this.all("payments").filter((p) => same(p["order_id"], order.id) && cents(p["kept"]) > 0)) {
      const amount = money(cents(payment["kept"]));
      this.insert("payment_refunds", {
        payment_id: payment.id,
        order_id: order.id,
        return_id: null,
        method: payment["method"],
        amount,
        reason: order["cancel_reason"] === "customer" ? "Cancelled by the customer" : "Cancelled by the shop",
        made_at: this.nowIso(),
        made_by: by.origin === "public" ? "customer" : by.name,
        automatic: true,
        refund_state: payment["method"] === "transfer" ? "not-sent" : "done",
        provider_ref: payment["method"] === "online" ? this.code("re_demo_", 24) : null,
      });
      if (payment["method"] === "gift_card") this.cardBack(payment["card_id"], amount);
    }
  }

  private recallCards(order: Row): void {
    const cards = this.all("offers.gift_cards").filter((g) => same(g["order_id"], order.id));
    if (cards.some((g) => cents(g["balance"]) < cents(g["amount"]))) throw new DemoRefusal(409, "OFFERS_CARD_SPENT", "The gift card was spent.", { reason: "card-spent-recall" });
    for (const g of cards) Object.assign(g, { status: "void", balance: "0.00" });
  }

  private cardBack(cardId: unknown, amount: string): void {
    const card = this.get("offers.gift_cards", cardId);
    if (card !== undefined) card["balance"] = money(cents(card["balance"]) + cents(amount));
  }

  private mailFor(order: Row, to: string, from: string): void {
    const at = { to: order["email"], orderId: order.id, language: order["language"] };
    if (to === "paid" && from !== "packed") this.mail("order-paid", at);
    if (to === "shipped") this.mail("order-shipped", at);
    if (to === "sent") this.mail("gift-sent", at);
    if (to === "cancelled") this.mail(order["cancel_reason"] === "unpaid" ? (order["pay_method"] === "transfer" ? "transfer-cancelled" : "order-cancelled-unpaid") : order["cancel_reason"] === "customer" ? "order-cancelled" : "order-cancelled-by-us", at);
  }

  /** A movement of Inventory's for a variant's item: taken, put back, counted in. */
  stockMove(variantId: unknown, qty: number, kind: string): void {
    const link = this.all(`${STOCK}links`).find((l) => same(l["source_row"], variantId));
    if (link === undefined || qty === 0) return;
    this.insert(`${STOCK}movements`, { item_id: link["item_id"], qty, kind, made_at: this.nowIso() });
  }

  /** What is left of a variant to sell now, Inventory's way; null when nothing counts it. */
  available(variantId: unknown): number | null {
    const link = this.all(`${STOCK}links`).find((l) => same(l["source_row"], variantId));
    if (link === undefined) return null;
    const point = this.all(`${STOCK}stock_points`).find((p) => same(p["item_id"], link["item_id"]));
    return point === undefined ? null : n(point["available"]);
  }

  /**
   * An order paid online, as the pay page would pay it: the demo has no money
   * and no payment service, so the order is simply paid what it still owes,
   * now, and the payment written down as Adminium writes one. A gift-cards-only
   * order is then sent, and its cards made, as Adminium does once it is paid.
   */
  pay(orderId: unknown): Row | null {
    const order = this.get("orders", orderId);
    if (order === undefined || cents(order["due"]) <= 0 || order["status"] !== "paying") return null;
    const payment = this.insert("payments", {
      order_id: order.id,
      method: "online",
      amount: money(cents(order["due"])),
      paid_at: this.nowIso(),
      made_by: "customer",
      payment_ref: this.code("pi_demo_", 24),
      provider: "stripe",
      note: null,
    });
    this.payStates.set(String(order.id), "paid");
    this.changed();
    this.moveOrder(order.id, "paying", "paid", {}, CUSTOMER);
    if (order["kind"] === "gift") this.sendCards(order);
    return payment;
  }

  /** A gift-cards-only order paid: Offers makes and loads each card, and the order is sent. */
  sendCards(order: Row): void {
    for (const g of this.all("gift_lines").filter((l) => same(l["order_id"], order.id))) {
      const code = this.code("NLGC", 12);
      this.insert("offers.gift_cards", { code, last4: code.slice(-4), amount: g["amount"], balance: g["amount"], status: "active", expires_on: null, to_name: g["to_name"], order_id: order.id });
    }
    this.moveOrder(order.id, "paid", "sent", {}, CUSTOMER);
  }

  // ── returns along their states ────────────────────────────────────────────

  moveReturn(id: unknown, from: string | null, to: string, values: Record<string, unknown>, by: By): Row {
    const ret = this.get("returns", id);
    if (ret === undefined) throw new DemoRefusal(404, "NOT_FOUND", "No such return.");
    const now = String(ret["status"]);
    if (from !== null && now !== from) throw new DemoRefusal(409, "STATE_MOVE_REFUSED", "It moved on.", { from: now, to });
    if (!(RETURN_MOVES[now] ?? []).includes(to)) throw new DemoRefusal(409, "STATE_MOVE_REFUSED", "Not a move a return makes.", { from: now, to });
    const after = { ...ret, ...values };
    if (to === "declined" && !set(after["staff_reason"])) throw new DemoRefusal(409, "STATE_MOVE_REFUSED", "A reason first.", { from: now, to });
    if (to === "refunded" && cents(ret["refund_short"]) > 0) throw new DemoRefusal(409, "STATE_MOVE_REFUSED", "Not refunded yet.", { from: now, to });
    const stamp = this.nowIso();
    Object.assign(ret, values, { status: to }, { [`${to}_at`]: stamp });
    if (to === "received") {
      ret["received_by"] = by.name;
      // Back in stock, unless the shop said a piece is not fit to sell.
      for (const rl of this.all("return_lines").filter((l) => same(l["return_id"], ret.id) && l["restock"] !== false)) this.stockMove(rl["variant_id"], n(rl["qty"]), "returned");
    }
    this.changed();
    this.mail(`return-${to}`, { to: this.get("orders", ret["order_id"])?.["email"], orderId: ret["order_id"], returnId: ret.id, language: ret["language"] });
    return ret;
  }

  // ── the clock ─────────────────────────────────────────────────────────────

  /**
   * What Adminium's clock runs: an order not paid by its deadline cancelled
   * (never while a payment is landing), a bank transfer not come by the end
   * of its last day the same. Runs whenever the clock moves.
   */
  tick(): void {
    for (const order of [...this.all("orders")]) {
      const status = String(order["status"]);
      const landing = this.payStates.get(String(order.id)) === "confirming";
      const late = status === "paying" ? !landing && Date.parse(String(order["pay_by"])) <= this.now : status === "awaiting_transfer" && set(order["transfer_by"]) && Date.parse(String(momentOf(`${String(order["transfer_by"])} 23:59`, this.zone))) <= this.now;
      if (!late) continue;
      Object.assign(order, { status: "cancelled", cancel_reason: "unpaid", cancelled_at: status === "paying" ? order["pay_by"] : this.nowIso(), cancelled_by: null });
      this.mail(order["pay_method"] === "transfer" ? "transfer-cancelled" : "order-cancelled-unpaid", { to: order["email"], orderId: order.id, language: order["language"] });
    }
    this.changed();
  }

  /** "+1 business day": the next day the shop ships (Monday to Friday, not Labor Day), at the same time of day. */
  advanceBusinessDay(): void {
    const next = nextBusinessDay(this.today(), closuresIn(this.tables));
    this.now = Date.parse(String(momentOf(`${next} ${this.wallTime()}`, this.zone)));
    this.tick();
  }

  /** The day a moment's "if paid now" ships by and arrives, counted from now: what a new order is told. */
  shipsIfPaidNow(transit: [number, number]): [string | null, string | null, string | null] {
    const closures = closuresIn(this.tables);
    const ships = addWorkingDays(this.nowIso(), 0, closures);
    return [ships, addWorkingDays(ships, transit[0], closures), addWorkingDays(ships, transit[1], closures)];
  }

  // ── the sample's reviews ──────────────────────────────────────────────────

  /** Forms & surveys' reviews of the shop's lines, from the sample world: published, or waiting for the owner. */
  private sampleReviews(): Row[] {
    const lines = this.all("order_lines");
    const products = this.all("products");
    const variants = this.all("variants");
    return WORLD.REVIEWS.flatMap((r, i) => {
      const order = this.orderByNumber(r.order);
      const product = products.find((p) => p["slug"] === r.product);
      if (order === undefined || product === undefined) return [];
      const line = lines.find((l) => same(l["order_id"], order.id) && same(byId(variants, l["variant_id"])?.["product_id"], product.id));
      const submitted = String(momentOf(`${r.on} 10:00`, this.zone));
      if (line !== undefined) line["reviewed_at"] = submitted;
      return [
        {
          id: i + 1,
          app: "ecommerce-shop",
          subject_table: "order_lines",
          subject_key: line === undefined ? null : String(line.id),
          about_table: "products",
          about_key: String(product.id),
          about_name: product["name"],
          about_detail: null,
          stars: r.stars,
          title: r.title,
          body: r.body,
          shown_name: r.name,
          state: r.state === "published" ? "published" : "waiting",
          hide_reason: null,
          reply: null,
          replied_at: null,
          submitted_at: submitted,
        },
      ];
    });
  }
}
