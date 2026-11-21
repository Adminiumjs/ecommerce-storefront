/**
 * The figures Adminium keeps for Northline, worked out the way the manifest's
 * rules say (`src/manifest/tables.ts`), and the shop's calendar: a variant's
 * price from its product's and its difference; a line's price frozen from its
 * variant when it is written, its total, its share of a code; an order's
 * goods, reductions, shipping (free from a figure), the state's sales tax on
 * the goods after reductions (rounded half up, never on shipping), its gift
 * cards and its total; what is paid and what is left; a return's refund;
 * Inventory's stock; Forms' review totals.
 *
 * The screens never work a figure out, so the demo's Adminium has to: this
 * is that half of it. Money is counted in cents and kept as the decimal text
 * the data API answers ("189.00"). A copy marked "frozen" in the manifest is
 * taken once, when the row is written (what an order was sold at stays what
 * it was); one that "follows" is taken again on every change.
 *
 * DEMO BUILD ONLY — nothing in a real build imports it.
 */
import { addDays, dayIn, isStudioDay, type Closure } from "../desk/time.ts";
import { DEMO_ZONE, STOCK, type Row, type Tables } from "./sample.ts";

// ── reading a value ─────────────────────────────────────────────────────────

export const same = (a: unknown, b: unknown): boolean => a !== null && a !== undefined && b !== null && b !== undefined && String(a) === String(b);
export const n = (value: unknown): number => {
  const v = Number(value);
  return value === null || value === undefined || value === "" || !Number.isFinite(v) ? 0 : v;
};
export const cents = (value: unknown): number => Math.round(n(value) * 100);
export const money = (c: number): string => (c / 100).toFixed(2);
export const set = (value: unknown): boolean => value !== null && value !== undefined && value !== "";
export const byId = (rows: readonly Row[], id: unknown): Row | undefined => rows.find((r) => same(r.id, id));
const yes = (value: unknown): boolean => value === true || value === 1 || value === "1" || value === "true";

// ── the shop's calendar ─────────────────────────────────────────────────────

/** Monday to Friday, the 14:00 cut-off: the app's own settings (`src/manifest/settings.ts`), as Northline keeps them. */
export const SHIP_DAYS = ["mon", "tue", "wed", "thu", "fri"] as const;
export const CUTOFF = "14:00";
/** Inventory's words: low below this many left, as the sample's shop shows them ("Only 3 left"). */
export const LOW_BELOW = 5;

/** The shop's closures in effect, as the calendar reads them. */
export function closuresIn(tables: Tables): Closure[] {
  return (tables["closures"] ?? []).filter((c) => c["active"] !== false).map((c) => ({ from: String(c["from_date"]).slice(0, 10), to: String(c["to_date"]).slice(0, 10) }));
}

export const isShipDay = (day: string, closures: readonly Closure[]): boolean => isStudioDay(day, SHIP_DAYS, closures);

/** The next business day after `day`: Monday to Friday, not a closure (Labor Day). */
export function nextBusinessDay(day: string, closures: readonly Closure[]): string {
  let d = addDays(day, 1);
  for (let guard = 0; !isShipDay(d, closures) && guard < 400; guard += 1) d = addDays(d, 1);
  return d;
}

/** The shop's wall time of an instant, "11:40". */
export function wallTime(instant: number | string, zone = DEMO_ZONE): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(instant));
}

/**
 * `addWorkingDays`: from a moment, the day it falls on when that is a
 * shipping day and before the cut-off, else the next shipping day; from a
 * date, that date when it is a shipping day, else the next; then so many
 * shipping days on.
 */
export function addWorkingDays(from: unknown, days: number, closures: readonly Closure[]): string | null {
  if (!set(from)) return null;
  const text = String(from);
  let d: string;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) d = isShipDay(text, closures) ? text : nextBusinessDay(text, closures);
  else {
    const day = dayIn(text, DEMO_ZONE);
    d = isShipDay(day, closures) && wallTime(text) < CUTOFF ? day : nextBusinessDay(day, closures);
  }
  for (let left = days; left > 0; left -= 1) d = nextBusinessDay(d, closures);
  return d;
}

// ── Offers & gift cards: the codes ──────────────────────────────────────────

/** A code as Offers keeps it: how much off, on which category (null: everything), until when, for whom. */
export interface Code {
  percent: number;
  on: string | null;
  label: string;
  until: string | null;
  guests: boolean;
  firstOrder: boolean;
}

/** The order states that count as an order made (`COUNTED`): a first-order code looks at these. */
export const COUNTED = ["paid", "packed", "shipped", "sent"];

/** Why Offers refuses a typed code, in its own reason words; null when it takes it. */
export function codeRefusal(code: Code | undefined, ctx: { day: string; signedIn: boolean; firstOrder: boolean; lineCategories: string[] }): string | null {
  if (code === undefined) return "unknown";
  if (code.until !== null && ctx.day > code.until) return "ended";
  if (!code.guests && !ctx.signedIn) return "needs-sign-in";
  if (code.firstOrder && !ctx.firstOrder) return "not-first-order";
  if (code.on !== null && !ctx.lineCategories.includes(code.on)) return "nothing-to-take-off";
  return null;
}

/** Each line's share of the codes: its percent of the line, rounded half up, on the lines the code is for. */
export function lineDiscounts(lines: readonly Row[], codes: readonly Code[], categorySlug: (line: Row) => string | null): number[] {
  return lines.map((line) => codes.reduce((off, code) => (code.on === null || code.on === categorySlug(line) ? off + Math.round((cents(line["line"]) * code.percent) / 100) : off), 0));
}

// ── one row's figures ───────────────────────────────────────────────────────

/** A variant's copies of its product and options, and its price: always taken again. */
function deriveVariant(v: Row, tables: Tables): void {
  const product = byId(tables["products"] ?? [], v["product_id"]);
  const options = tables["option_values"] ?? [];
  const colour = byId(options, v["colour_id"]);
  const size = byId(options, v["size_id"]);
  Object.assign(v, {
    colour_code: colour?.["code"] ?? null,
    size_code: size?.["code"] ?? null,
    colour_label: colour?.["label"] ?? null,
    size_label: size?.["label"] ?? null,
    product_slug: product?.["slug"] ?? null,
    base_price: money(cents(product?.["price"])),
    price: money(cents(product?.["price"]) + cents(v["price_delta"])),
    category_id: product?.["category_id"] ?? null,
    product_name: product?.["name"] ?? null,
    product_status: product?.["status"] ?? null,
  });
  v["combo"] = [v["product_slug"], v["colour_code"], v["size_code"]].map((x) => x ?? "").join("/");
  v["stock_name"] = [v["product_name"], v["colour_label"], v["size_label"], v["sku"]].filter((x) => set(x)).join(" · ");
}

/** A line's copies of its variant, taken once when it is written. */
export function freezeLine(line: Row, tables: Tables): void {
  if (set(line["each"])) return;
  const v = byId(tables["variants"] ?? [], line["variant_id"]);
  Object.assign(line, {
    sku: v?.["sku"] ?? null,
    product_id: v?.["product_id"] ?? null,
    category_id: v?.["category_id"] ?? null,
    product_name: v?.["product_name"] ?? null,
    colour: v?.["colour_label"] ?? null,
    size: v?.["size_label"] ?? null,
    weight_g: v?.["weight_g"] ?? null,
    each: money(cents(v?.["price"])),
  });
}

/** An order's copies of its state and its shipping, taken once when it is written. */
export function freezeOrder(order: Row, tables: Tables): void {
  if (!set(order["state_code"]) && set(order["region_id"])) {
    const region = byId(tables["regions"] ?? [], order["region_id"]);
    Object.assign(order, { state_code: region?.["code"] ?? null, zone_id: region?.["zone_id"] ?? null, tax_rate: region === undefined ? null : n(region["tax_rate"]).toFixed(3) });
  }
  if (!set(order["service_id"]) && set(order["offer_id"])) {
    const offer = byId(tables["shipping_offers"] ?? [], order["offer_id"]);
    const service = byId(tables["shipping_services"] ?? [], offer?.["service_id"]);
    Object.assign(order, {
      service_id: offer?.["service_id"] ?? null,
      ship_price: offer === undefined ? null : money(cents(offer["price"])),
      free_from: offer === undefined || !set(offer["free_from"]) ? null : money(cents(offer["free_from"])),
      transit_min: service?.["transit_min"] ?? null,
      transit_max: service?.["transit_max"] ?? null,
    });
  }
}

/** A gift card line's copies of its amount and the order's name, taken once. */
export function freezeGift(gift: Row, order: Row | undefined, tables: Tables): void {
  if (set(gift["amount"])) return;
  const amount = byId(tables["gift_amounts"] ?? [], gift["amount_id"]);
  Object.assign(gift, { amount: money(cents(amount?.["amount"])), load_amount: money(cents(amount?.["amount"])), sender: order?.["name"] ?? null, language: order?.["language"] ?? null });
}

/** A line's own figures: its weight, its total, its tax rate, what is in returns. */
export function deriveLine(line: Row, order: Row | undefined, returnLines: readonly Row[]): void {
  const qty = Math.max(1, n(line["qty"]));
  line["variant_label"] = [line["colour"], line["size"]].filter((x) => set(x)).join(" · ") || null;
  line["line_weight_g"] = n(line["weight_g"]) * qty;
  line["line"] = money(qty * cents(line["each"]));
  if (!set(line["tax_rate"]) && order !== undefined && set(order["tax_rate"])) line["tax_rate"] = order["tax_rate"];
  const inReturns = returnLines.filter((r) => same(r["line_id"], line.id) && !set(r["void_at"])).reduce((sum, r) => sum + n(r["qty"]), 0);
  line["returned_qty"] = Math.min(qty, inReturns);
  line["returnable"] = qty - (line["returned_qty"] as number);
}

/** An order's money from its lines, gift cards, payments and refunds, as its formulas and rollups say. */
export function deriveOrderMoney(order: Row, lines: readonly Row[], gifts: readonly Row[], payments: readonly Row[], refunds: readonly Row[]): void {
  const goods = lines.reduce((sum, l) => sum + cents(l["line"]), 0);
  const discount = set(order["discount"]) ? cents(order["discount"]) : 0;
  const net = Math.max(0, goods - discount);
  const shipping = !set(order["offer_id"]) ? 0 : cents(order["free_from"]) > 0 && net >= cents(order["free_from"]) ? 0 : cents(order["ship_price"]);
  // Half up, to the cent: the formula's `round(net × rate ÷ 100, 2)`.
  const tax = Math.round((net * n(order["tax_rate"])) / 100 + 1e-9);
  const giftsTotal = gifts.reduce((sum, g) => sum + cents(g["amount"]), 0);
  const total = net + shipping + tax + giftsTotal;
  const kept = payments.reduce((sum, p) => sum + cents(p["kept"]), 0);
  const paid = Math.min(total, kept);
  const latest = payments.map((p) => String(p["paid_at"] ?? "")).filter((x) => x !== "").sort().at(-1) ?? null;
  Object.assign(order, {
    goods: money(goods),
    net: money(net),
    shipping: money(shipping),
    tax: money(tax),
    gifts: money(giftsTotal),
    total: money(total),
    paid: money(paid),
    due: money(total - paid),
    due_goods: money(Math.max(0, total - giftsTotal - paid)),
    refunded: money(refunds.reduce((sum, r) => sum + cents(r["counted"]), 0)),
    pieces: lines.reduce((sum, l) => sum + n(l["qty"]), 0),
    weight_g: lines.reduce((sum, l) => sum + n(l["line_weight_g"]), 0),
    paid_at: latest,
  });
}

/** An order's dates, stamped once their column is there: ships-by from its payment, the arrival from that. */
export function stampOrderDates(order: Row, closures: readonly Closure[]): void {
  if (order["kind"] === "gift") return;
  if (!set(order["ships_by"]) && set(order["paid_at"])) order["ships_by"] = addWorkingDays(order["paid_at"], 0, closures);
  if (set(order["ships_by"])) {
    if (!set(order["arrives_from"])) order["arrives_from"] = addWorkingDays(order["ships_by"], n(order["transit_min"]), closures);
    if (!set(order["arrives_to"])) order["arrives_to"] = addWorkingDays(order["ships_by"], n(order["transit_max"]), closures);
  }
}

/** The dates an order is told when it is written: if paid now, and the bank transfer's last day. */
export function stampPlaced(order: Row, settings: Row, closures: readonly Closure[]): void {
  const placed = String(order["placed_at"]);
  const at = Date.parse(placed);
  order["pay_by"] = new Date(at + n(settings["pay_hold_minutes"] ?? 30) * 60_000).toISOString();
  order["transfer_days"] ??= n(settings["transfer_days"] ?? 5);
  order["transfer_by"] = addWorkingDays(placed, n(order["transfer_days"]), closures);
  order["stock_until"] = new Date(at + 45 * 86_400_000).toISOString();
  order["link_expires"] = new Date(at + 120 * 86_400_000).toISOString();
  if (order["kind"] !== "gift") {
    order["est_ships_by"] = addWorkingDays(placed, 0, closures);
    order["est_from"] = addWorkingDays(order["est_ships_by"], n(order["transit_min"]), closures);
    order["est_to"] = addWorkingDays(order["est_ships_by"], n(order["transit_max"]), closures);
  }
}

/** A return line's copies of its order line, and what it gives back: the price less its share, times the pieces, with its tax. */
export function deriveReturnLine(rl: Row, lines: readonly Row[]): void {
  const line = byId(lines, rl["line_id"]);
  if (!set(rl["line_paid"]) && line !== undefined) {
    Object.assign(rl, {
      variant_id: line["variant_id"],
      sku: line["sku"],
      product_name: line["product_name"],
      variant_label: line["variant_label"],
      line_qty: line["qty"],
      line_paid: line["line"],
      line_discount: line["discount"] ?? null,
      tax_rate: line["tax_rate"] ?? null,
    });
  }
  const perLine = (cents(rl["line_paid"]) - cents(rl["line_discount"])) * n(rl["qty"]);
  const goods = perLine / Math.max(1, n(rl["line_qty"]));
  rl["refund"] = money(Math.round(goods * (1 + n(rl["tax_rate"]) / 100) + 1e-9));
}

// ── Inventory and Forms ─────────────────────────────────────────────────────

/** The order states whose lines hold their stock, until the order's `stock_until`. */
export const HOLDING = ["paying", "awaiting_transfer", "paid"];

/**
 * Inventory's stock points, one an item in the one place: on hand from the
 * opening count and every movement since (a piece packed, a return put back,
 * a count); held by the lines of the orders still waiting; what is left is
 * on hand less held, and its words are `out`, `low` below five, or `in`.
 */
export function deriveStock(tables: Tables, now: number): void {
  const items = tables[`${STOCK}items`] ?? [];
  const links = tables[`${STOCK}links`] ?? [];
  const opening = tables[`${STOCK}receipt_lines`] ?? [];
  const moves = tables[`${STOCK}movements`] ?? [];
  const place = tables[`${STOCK}places`]?.[0]?.id ?? 1;
  const held = new Map<string, number>();
  const orders = tables["orders"] ?? [];
  for (const line of tables["order_lines"] ?? []) {
    const order = byId(orders, line["order_id"]);
    if (order === undefined || !HOLDING.includes(String(order["status"]))) continue;
    if (set(order["stock_until"]) && Date.parse(String(order["stock_until"])) <= now) continue;
    const link = links.find((l) => same(l["source_row"], line["variant_id"]));
    if (link === undefined) continue;
    const key = String(link["item_id"]);
    held.set(key, (held.get(key) ?? 0) + n(line["qty"]));
  }
  tables[`${STOCK}stock_points`] = items.map((item) => {
    const onHand = opening.filter((r) => same(r["item_id"], item.id)).reduce((sum, r) => sum + n(r["qty_typed"]), 0) + moves.filter((m) => same(m["item_id"], item.id)).reduce((sum, m) => sum + n(m["qty"]), 0);
    const h = held.get(String(item.id)) ?? 0;
    const available = onHand - h;
    return { id: item.id, item_id: item.id, place_id: place, on_hand: onHand, held: h, available, state: available <= 0 ? "out" : available < LOW_BELOW ? "low" : "in" };
  });
}

/** Forms' totals of the shop's published reviews, by product: how many, their stars' sum, and each star's count. */
export function deriveReviewTotals(tables: Tables): void {
  const published = (tables["forms.reviews"] ?? []).filter((r) => r["state"] === "published");
  const byProduct = new Map<string, Row[]>();
  for (const r of published) byProduct.set(String(r["about_key"]), [...(byProduct.get(String(r["about_key"])) ?? []), r]);
  tables["forms.review_totals"] = [...byProduct.entries()].map(([key, rows], i) => ({
    id: i + 1,
    app: "ecommerce-shop",
    about_table: "products",
    about_key: key,
    count: rows.length,
    sum: rows.reduce((s, r) => s + n(r["stars"]), 0),
    ...Object.fromEntries([1, 2, 3, 4, 5].map((star) => [`c${String(star)}`, rows.filter((r) => n(r["stars"]) === star).length])),
  }));
}

// ── every stored figure ─────────────────────────────────────────────────────

/** After a write: every follow copy, formula and rollup taken again, as Adminium keeps them. */
export function deriveAll(tables: Tables, now: number): void {
  const closures = closuresIn(tables);
  const products = tables["products"] ?? [];
  for (const c of tables["categories"] ?? []) c["products_count"] = products.filter((p) => same(p["category_id"], c.id) && p["status"] === "active").length;
  for (const p of products) {
    p["category_name"] = byId(tables["categories"] ?? [], p["category_id"])?.["name"] ?? null;
    p["variants_count"] = (tables["variants"] ?? []).filter((v) => same(v["product_id"], p.id)).length;
  }
  for (const o of tables["option_values"] ?? []) o["product_status"] = byId(products, o["product_id"])?.["status"] ?? null;
  for (const v of tables["variants"] ?? []) deriveVariant(v, tables);
  for (const offer of tables["shipping_offers"] ?? []) {
    const service = byId(tables["shipping_services"] ?? [], offer["service_id"]);
    const zone = byId(tables["zones"] ?? [], offer["zone_id"]);
    Object.assign(offer, { service_label: service?.["label"] ?? null, zone_label: zone?.["label"] ?? null, transit_min: service?.["transit_min"] ?? null, transit_max: service?.["transit_max"] ?? null });
    offer["label"] = `${String(offer["service_label"] ?? "")} · ${String(offer["zone_label"] ?? "")}`;
  }
  for (const r of tables["regions"] ?? []) r["tax_rate"] = n(r["tax_rate"]).toFixed(3);
  for (const s of tables["settings"] ?? []) s["transfer_on"] ??= true;
  for (const v of tables["variants"] ?? []) v["sold_out"] = yes(v["sold_out"]);

  const orders = tables["orders"] ?? [];
  const lines = tables["order_lines"] ?? [];
  const returnLines = tables["return_lines"] ?? [];
  const refunds = tables["payment_refunds"] ?? [];
  const payments = tables["payments"] ?? [];
  for (const r of refunds) {
    const payment = byId(payments, r["payment_id"]);
    r["order_id"] ??= payment?.["order_id"] ?? null;
    r["method"] ??= payment?.["method"] ?? null;
    r["counted"] = r["refund_state"] === "not-sent" ? "0.00" : money(cents(r["amount"]));
  }
  for (const p of payments) {
    const returned = refunds.filter((r) => same(r["payment_id"], p.id)).reduce((sum, r) => sum + cents(r["counted"]), 0);
    p["returned"] = money(returned);
    p["kept"] = money(cents(p["amount"]) - returned - cents(p["refunded_elsewhere"]));
  }
  for (const order of orders) {
    freezeOrder(order, tables);
    const mine = lines.filter((l) => same(l["order_id"], order.id));
    for (const line of mine) {
      freezeLine(line, tables);
      deriveLine(line, order, returnLines);
    }
    const gifts = (tables["gift_lines"] ?? []).filter((g) => same(g["order_id"], order.id));
    for (const g of gifts) freezeGift(g, order, tables);
    deriveOrderMoney(
      order,
      mine,
      gifts,
      payments.filter((p) => same(p["order_id"], order.id)),
      refunds.filter((r) => same(r["order_id"], order.id)),
    );
    stampOrderDates(order, closures);
  }
  for (const c of tables["customers"] ?? []) c["orders_count"] = orders.filter((o) => same(o["customer_id"], c.id)).length;
  for (const rl of returnLines) deriveReturnLine(rl, lines);
  for (const ret of tables["returns"] ?? []) {
    const order = byId(orders, ret["order_id"]);
    ret["order_number"] ??= order?.["number"] ?? null;
    ret["language"] ??= order?.["language"] ?? null;
    const goods = returnLines.filter((rl) => same(rl["return_id"], ret.id)).reduce((sum, rl) => sum + cents(rl["refund"]), 0);
    const amount = goods + cents(ret["shipping_refund"]);
    const refunded = refunds.filter((r) => same(r["return_id"], ret.id)).reduce((sum, r) => sum + cents(r["counted"]), 0);
    Object.assign(ret, { refund_goods: money(goods), refund_amount: money(amount), refunded_total: money(refunded), refund_short: money(amount - refunded) });
  }
  for (const rr of tables["restock_requests"] ?? []) rr["sku"] ??= byId(tables["variants"] ?? [], rr["variant_id"])?.["sku"] ?? null;
  deriveStock(tables, now);
  deriveReviewTotals(tables);
}
