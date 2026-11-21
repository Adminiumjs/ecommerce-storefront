/**
 * A stand-in for the after-order door, for the screens' tests: Northline's
 * sample world (`src/sample/northline-data.json`) as the customer's and the
 * link's entries would answer it. Priya Raman is customer 1, with NL-1066
 * being paid and NL-1053 shipped; Marcus Hale's NL-1065 (paid, not packed)
 * opens by its own link. It keeps every call with its arguments, so a test
 * can hold each write to the body the page sends. It is not Adminium: the
 * figures it holds are the sample's, and a return's refund here is the
 * sample's arithmetic, never the page's.
 *
 * Tests only; nothing that ships imports it.
 */
import data from "../sample/northline-data.json";
import type { AfterPort, CodeAnswer, Me, OrderRead, Receipt, ReturnAsk, ReviewState, ReviewValues, Via } from "./after-port.ts";
import { ShopError, type Id, type Product, type Refused, type Row } from "./port.ts";
import { sampleWorld } from "./testing.ts";

export interface AfterCall {
  call: string;
  args: unknown[];
}

export interface FakeRows {
  customers: Row[];
  orders: Row[];
  lines: Row[];
  gifts: Row[];
  payments: Row[];
  refunds: Row[];
  returns: Row[];
  returnLines: Row[];
}

export interface FakeAfter extends AfterPort {
  calls: AfterCall[];
  rows: FakeRows;
  /** The code the next e-mail carries. */
  code: string;
  /** The code NL-1065's e-mails carry in their link. */
  linkToken: string;
  /** Who is signed in, by customer id, or nobody. */
  session: number | null;
  /** The order the held link session opens, or none. */
  shared: Id | null;
  /** Whether Forms' reviews are on (the review route answers 404 when not). */
  reviewsOn: boolean;
  /** Whether the key offers the order's receipt. */
  receipts: boolean;
  /** "Delete my details" asks for a fresh code first. */
  stepUp: boolean;
  /** The code typed back ran out (the next check answers `spent`). */
  codeSpent: boolean;
  /** Refuse the next write with this refusal. */
  refuseNext: (refused: Partial<Refused> & { code: string }) => void;
  /** An order by its number. */
  order: (number: string) => Row;
  /** NL-1066 as a shop that takes no payments online: a bank transfer, with its own transfer details. */
  asTransfer: (number: string) => void;
}

/** A moment on the shop's clock (Portland, summer time) as the instant Adminium keeps. */
const at = (local: string | null): string | null => (local === null ? null : new Date(`${local.length === 10 ? `${local}T12:00` : local}:00-07:00`).toISOString());
const cents = (v: unknown) => Math.round(Number(v ?? 0) * 100);
const fixed = (c: number) => (c / 100).toFixed(2);
const orderId = (number: string) => Number(number.replace(/\D/g, ""));

const STATUS: Record<string, [string, string | null]> = {
  shipped: ["shipped", null],
  gift_sent: ["sent", null],
  packed: ["packed", null],
  paid: ["paid", null],
  paying: ["paying", null],
  cancelled_customer: ["cancelled", "customer"],
  cancelled_staff: ["cancelled", "stock"],
  cancelled_unpaid: ["cancelled", "unpaid"],
};

/** The rows the sample world holds for Priya and Marcus, as the after-order entries read them. */
export function sampleAfterRows(): FakeRows {
  const world = sampleWorld();
  const rows: FakeRows = { customers: [], orders: [], lines: [], gifts: [], payments: [], refunds: [], returns: [], returnLines: [] };
  for (const c of data.CUSTOMERS.filter((x) => x.id === 1 || x.id === 2)) rows.customers.push({ id: c.id, name: c.name, email: c.email, language: "en-US", news: c.news });
  for (const o of data.ORDERS.filter((x) => x.customer === 1 || x.customer === 2)) {
    const id = orderId(o.number);
    const [status, reason] = STATUS[o.state] ?? ["paid", null];
    const region = world.regions.find((r) => r.code === o.ship.state);
    const service = world.base.services.find((s) => s.code === o.service);
    const offer = world.offers.find((x) => String(x.serviceId) === String(service?.id) && String(x.zoneId) === String(region?.zoneId));
    const paid = ["paid", "packed", "shipped", "sent"].includes(status) ? o.total : "0.00";
    // NL-1065 was paid before the cut-off by Express: Adminium dated its arrival when it was paid.
    const arrives = o.arrives ?? (o.number === "NL-1065" ? ["2026-08-20", "2026-08-20"] : null);
    rows.orders.push({
      id,
      number: o.number,
      status,
      kind: o.lines.length === 0 ? "gift" : "goods",
      pay_method: "online",
      name: o.name,
      email: o.email,
      ship_name: o.name,
      address_line1: o.ship.line1,
      address_line2: null,
      city: o.ship.city,
      zip: o.ship.zip,
      region_id: region?.id ?? null,
      state_code: o.ship.state,
      offer_id: offer?.id ?? null,
      service_id: service?.id ?? null,
      tax_rate: region?.taxRate ?? null,
      goods: o.goods,
      discount: cents(o.discount) === 0 ? null : o.discount,
      net: o.net,
      shipping: o.shipping,
      tax: o.tax,
      gifts: o.giftsTotal,
      total: o.total,
      paid,
      due: fixed(cents(o.total) - cents(paid)),
      refunded: "0.00",
      pieces: o.lines.reduce((n, l) => n + l.qty, 0),
      placed_at: at(o.placed),
      pay_by: status === "paying" ? new Date(Date.parse(at(o.placed)!) + data.SHOP.payHoldMinutes * 60_000).toISOString() : null,
      transfer_by: null,
      transfer_note: null,
      paid_at: at(o.paidAt),
      ships_by: o.shipsBy,
      arrives_from: arrives?.[0] ?? null,
      arrives_to: arrives?.[1] ?? null,
      est_ships_by: o.shipsBy,
      est_from: arrives?.[0] ?? null,
      est_to: arrives?.[1] ?? null,
      packed_at: o.shippedOn === null ? null : at(`${o.shippedOn}T09:30`),
      shipped_at: o.shippedOn === null ? null : at(`${o.shippedOn}T15:10`),
      carrier: o.tracking === null ? null : data.SHOP.carrier.name,
      tracking: o.tracking,
      cancelled_at: status === "cancelled" ? at(o.placed) : null,
      cancel_reason: reason,
      link_expires: null,
      customer_proved: true,
    });
    o.lines.forEach((l, i) => {
      const v = world.variants.find((x) => x.sku === l.sku)!;
      const p = world.products.find((x) => x.id === v.productId)!;
      rows.lines.push({
        id: id * 10 + i + 1,
        order_id: id,
        variant_id: v.id,
        qty: l.qty,
        sku: l.sku,
        product_id: p.id,
        product_name: p.name,
        colour: v.colourLabel,
        size: v.sizeLabel,
        variant_label: [v.colourLabel, v.sizeLabel].filter(Boolean).join(" · "),
        each: l.each,
        line: l.line,
        discount: cents(l.discount) === 0 ? null : l.discount,
        returned_qty: 0,
        returnable: l.qty,
        reviewed_at: null,
      });
    });
    if (cents(paid) > 0) rows.payments.push({ id: id * 10, order_id: id, method: "online", provider: o.method === "wallet" ? "paypal" : "stripe", amount: paid, returned: "0.00", kept: paid, card_last4: null, paid_at: at(o.paidAt) });
  }
  return rows;
}

export function fakeAfter(): FakeAfter {
  const calls: AfterCall[] = [];
  let refusal: Refused | null = null;
  let triesLeft = 5;
  let returnNumber = Number(String(data.RETURNS.at(-1)?.number ?? "RT-1004").replace(/\D/g, "")) + 1;
  const record = (call: string, ...args: unknown[]) => calls.push({ call, args });
  const refuse = (): void => {
    if (refusal === null) return;
    const r = refusal;
    refusal = null;
    throw new ShopError(r, r.code);
  };
  const missing = () => new ShopError({ code: "PUBLIC_REF_NOT_FOUND", status: 404, column: null, child: null, index: null, reason: null, changed: null, retryAfter: null, params: {} }, "not found");
  const now = "2026-08-18T18:40:00.000Z";

  const read = (via: Via, order: Row): OrderRead => {
    const id = String(order["id"]);
    const returns = fake.rows.returns.filter((r) => String(r["order_id"]) === id);
    const returnIds = returns.map((r) => String(r["id"]));
    return {
      via,
      order: { ...order },
      lines: fake.rows.lines.filter((l) => String(l["order_id"]) === id).map((l) => ({ ...l })),
      gifts: fake.rows.gifts.filter((l) => String(l["order_id"]) === id),
      payments: fake.rows.payments.filter((l) => String(l["order_id"]) === id),
      refunds: fake.rows.refunds.filter((l) => String(l["order_id"]) === id),
      returns: returns.map((r) => ({ ...r })),
      returnLines: fake.rows.returnLines.filter((l) => returnIds.includes(String(l["return_id"]))),
    };
  };
  const mine = (): Row[] => (fake.session === null ? [] : fake.rows.orders.filter((o) => fake.rows.customers.some((c) => c["id"] === fake.session && c["email"] === o["email"])));
  const reachable = (via: Via, orderId: Id): Row | undefined => (via === "link" ? fake.rows.orders.find((o) => String(o["id"]) === String(orderId) && String(o["id"]) === String(fake.shared)) : mine().find((o) => String(o["id"]) === String(orderId)));
  const lineOf = (via: Via, lineId: Id): Row => {
    const line = fake.rows.lines.find((l) => String(l["id"]) === String(lineId));
    if (line === undefined || reachable(via, line["order_id"] as Id) === undefined) throw missing();
    return line;
  };

  const fake: FakeAfter = {
    calls,
    rows: sampleAfterRows(),
    code: "482913",
    linkToken: "Q7M2K9XW4R8TB3NV",
    session: null,
    shared: null,
    reviewsOn: true,
    receipts: true,
    stepUp: false,
    codeSpent: false,
    refuseNext: (r) => {
      refusal = { status: 400, column: null, child: null, index: null, reason: null, changed: null, retryAfter: null, params: {}, ...r };
    },
    order: (number) => {
      const row = fake.rows.orders.find((o) => o["number"] === number);
      if (row === undefined) throw new Error(`no order ${number}`);
      return row;
    },
    asTransfer: (number) => {
      const o = fake.order(number);
      const t = data.SHOP.transfer;
      Object.assign(o, {
        status: "awaiting_transfer",
        pay_method: "transfer",
        pay_by: null,
        transfer_by: "2026-08-25",
        transfer_note: `${t.accountName}\n${t.bank}\nRouting ${t.routing}\nAccount ${t.account}\nReference ${String(o["number"])}`,
      });
    },

    async requestCode(email, language) {
      record("requestCode", email, language);
      refuse();
      triesLeft = 5;
    },
    async verifyCode(email, code): Promise<CodeAnswer> {
      record("verifyCode", email, code);
      refuse();
      if (fake.codeSpent) return { ok: false, reason: "spent" };
      const who = fake.rows.customers.find((c) => String(c["email"]).toLowerCase() === email.trim().toLowerCase());
      if (code !== fake.code || who === undefined) {
        triesLeft -= 1;
        return triesLeft > 0 ? { ok: false, reason: "wrong", triesLeft } : { ok: false, reason: "spent" };
      }
      fake.session = who["id"] as number;
      fake.stepUp = false;
      return { ok: true };
    },
    async peekSignInLink(token) {
      record("peekSignInLink", token);
      return token.startsWith("SIGNIN") ? "Priya" : null;
    },
    async openSignInLink(token) {
      record("openSignInLink", token);
      if (!token.startsWith("SIGNIN")) return false;
      fake.session = 1;
      return true;
    },
    signedIn: () => fake.session !== null,
    async signOut() {
      record("signOut");
      fake.session = null;
    },
    async forgetMe() {
      record("forgetMe");
      refuse();
      if (fake.stepUp) throw new ShopError({ code: "PUBLIC_CODE_STEP_UP", status: 403, column: null, child: null, index: null, reason: null, changed: null, retryAfter: null, params: {} }, "step up");
      const me = fake.rows.customers.find((c) => c["id"] === fake.session);
      if (me !== undefined) Object.assign(me, { name: null, email: null, news: false });
      fake.session = null;
    },
    async me(): Promise<Me | null> {
      record("me");
      const row = fake.rows.customers.find((c) => c["id"] === fake.session);
      return row === undefined ? null : { id: row["id"] as Id, name: String(row["name"] ?? ""), email: String(row["email"] ?? ""), news: row["news"] === true, language: "en-US" };
    },
    async stopNews(me) {
      record("stopNews", me.id);
      refuse();
      const row = fake.rows.customers.find((c) => c["id"] === me.id);
      if (row !== undefined) row["news"] = false;
    },
    async myOrders() {
      record("myOrders");
      return mine().sort((a, b) => String(b["placed_at"]).localeCompare(String(a["placed_at"]))).map((o) => ({ ...o }));
    },
    async myReturns() {
      record("myReturns");
      const ids = mine().map((o) => String(o["id"]));
      return fake.rows.returns.filter((r) => ids.includes(String(r["order_id"]))).sort((a, b) => String(b["asked_at"]).localeCompare(String(a["asked_at"]))).map((r) => ({ ...r }));
    },
    async readMine(orderId) {
      record("readMine", orderId);
      const order = mine().find((o) => String(o["id"]) === String(orderId));
      return order === undefined ? null : read("mine", order);
    },
    async openShared(token) {
      record("openShared", token);
      if (token !== fake.linkToken) return "unknown";
      fake.shared = fake.order("NL-1065")["id"] as Id;
      return "opened";
    },
    sharedHeld: () => fake.shared !== null,
    async readShared() {
      record("readShared");
      const order = fake.rows.orders.find((o) => String(o["id"]) === String(fake.shared));
      return order === undefined ? null : read("link", order);
    },
    async cancel(via, orderId) {
      record("cancel", via, orderId, { status: "cancelled", cancel_reason: "customer" });
      refuse();
      const order = reachable(via, orderId);
      if (order === undefined || !["paid", "awaiting_transfer"].includes(String(order["status"]))) throw missing();
      Object.assign(order, { status: "cancelled", cancel_reason: "customer", cancelled_at: now });
      if (cents(order["paid"]) > 0) {
        const pay = fake.rows.payments.find((p) => String(p["order_id"]) === String(orderId));
        fake.rows.refunds.push({ id: Number(orderId) * 10 + 1, payment_id: pay?.["id"] ?? null, order_id: orderId, return_id: null, method: pay?.["method"] ?? "online", amount: order["paid"], refund_state: "pending", made_at: now });
        order["refunded"] = order["paid"];
      }
      return { ...order };
    },
    async newLink(orderId) {
      record("newLink", orderId);
      refuse();
      if (reachable("mine", orderId) === undefined) throw missing();
    },
    async askReturn(via, ask: ReturnAsk) {
      record("askReturn", via, ask);
      refuse();
      const order = reachable(via, ask.orderId);
      if (order === undefined) throw missing();
      const id = returnNumber;
      returnNumber += 1;
      let refund = 0;
      const made: Row[] = ask.lines.map((l, i) => {
        const line = fake.rows.lines.find((x) => String(x["id"]) === String(l.lineId))!;
        const share = Math.round(((cents(line["line"]) - cents(line["discount"])) * l.qty) / Number(line["qty"]));
        refund += share;
        line["returned_qty"] = Number(line["returned_qty"]) + l.qty;
        line["returnable"] = Number(line["qty"]) - Number(line["returned_qty"]);
        return { id: id * 10 + i, return_id: id, line_id: l.lineId, qty: l.qty, sku: line["sku"], product_name: line["product_name"], variant_label: line["variant_label"], refund: fixed(share) };
      });
      const row: Row = { id, number: `RT-${id}`, order_id: ask.orderId, order_number: order["number"], status: "asked", reason: ask.reason, note: ask.note.trim() === "" ? null : ask.note.trim(), tracking: null, staff_reason: null, refund_goods: fixed(refund), shipping_refund: null, refund_amount: fixed(refund), refunded_total: "0.00", asked_at: now, approved_at: null, declined_at: null, received_at: null, refunded_at: null };
      fake.rows.returns.push(row);
      fake.rows.returnLines.push(...made);
      return { ...row };
    },
    async reviewState(via, lineId): Promise<ReviewState | null> {
      record("reviewState", via, lineId);
      if (!fake.reviewsOn) return null;
      const line = lineOf(via, lineId);
      const order = fake.rows.orders.find((o) => o["id"] === line["order_id"]);
      return { open: order?.["status"] === "shipped" && line["reviewed_at"] === null, reviewedAt: (line["reviewed_at"] as string | null) ?? null };
    },
    async sendReview(via, lineId, values: ReviewValues) {
      record("sendReview", via, lineId, values);
      refuse();
      const line = lineOf(via, lineId);
      line["reviewed_at"] = now;
      return { reviewedAt: now };
    },
    async receipt(via, orderId): Promise<Receipt | null> {
      record("receipt", via, orderId);
      if (!fake.receipts) return null;
      const order = reachable(via, orderId);
      return order === undefined || ["paying", "awaiting_transfer", "cancelled"].includes(String(order["status"])) ? null : { url: `https://northline.example/documents/${String(orderId)}`, number: `R-${String(orderId)}` };
    },
    async productsByIds(ids): Promise<Product[]> {
      record("productsByIds", ids);
      const world = sampleWorld();
      return world.products.filter((p) => ids.map(String).includes(String(p.id))).map(({ world: _w, ...p }) => p);
    },
  };
  return fake;
}
