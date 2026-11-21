/**
 * What the desk's screens read out of the rows: which orders are to pack,
 * what the pick list holds, how each variant's stock stands, which returns
 * wait on whom. Every figure is a stored column Adminium worked out; these
 * only pick rows and add up the pieces a list shows (a pick list's "10
 * pieces" is the sum of the lines' stored quantities), never a price.
 *
 * Every count a tile shows is the length of the list it opens, built by the
 * same function: a tile and its list cannot disagree.
 */
import type { DeskData, Person } from "./door.ts";
import { num, same, text, type Id, type Row } from "./wire.ts";

export const DHL = "shipping-dhl";
export const INVENTORY = "inventory";
export const FORMS = "forms";
export const INVOICES = "invoices";

/** The person is the shop's owner (a server that names no roles shows every button, and refuses what it refuses). */
export const isOwner = (who: Person): boolean => who.roles.length === 0 || who.roles.includes("owner");
export const isPacker = (who: Person): boolean => !isOwner(who) && who.roles.includes("packer");

// ── orders ──────────────────────────────────────────────────────────────────

export const status = (order: Row): string => text(order["status"]) ?? "paying";
export const isGift = (order: Row): boolean => text(order["kind"]) === "gift";

/** Paid and not yet packed: the orders to pack, oldest payment first. */
export function toPack(data: DeskData): Row[] {
  return data.orders.filter((o) => status(o) === "paid" && !isGift(o)).sort((a, b) => String(a["paid_at"] ?? "").localeCompare(String(b["paid_at"] ?? "")) || Number(a.id) - Number(b.id));
}

/** Packed, waiting to go. */
export function packed(data: DeskData): Row[] {
  return data.orders.filter((o) => status(o) === "packed").sort((a, b) => String(a["packed_at"] ?? "").localeCompare(String(b["packed_at"] ?? "")));
}

/** Waiting for the customer's money: on the pay page, or a bank transfer to come. */
export function waitingForPayment(data: DeskData): Row[] {
  return data.orders.filter((o) => status(o) === "paying" || status(o) === "awaiting_transfer");
}

/** Money to give back: a cancelled order that still keeps some (a transfer that came late, a payment that landed after the cancel). */
export function owed(data: DeskData): Row[] {
  return data.orders.filter((o) => status(o) === "cancelled" && (num(o["paid"]) ?? 0) > 0);
}

/** A paid order whose stock hold runs out within `days` (a paid order keeps its stock 45 days from placing). */
export function holdEndingSoon(data: DeskData, now: number, days = 7): Row[] {
  return toPack(data).filter((o) => {
    const until = Date.parse(String(o["stock_until"] ?? ""));
    return !Number.isNaN(until) && until - now <= days * 86_400_000;
  });
}

export const linesOf = (data: DeskData, order: Row): Row[] => data.lines.filter((l) => same(l["order_id"], order.id));
export const giftLinesOf = (data: DeskData, order: Row): Row[] => data.giftLines.filter((l) => same(l["order_id"], order.id));
export const paymentsOf = (data: DeskData, order: Row): Row[] => data.payments.filter((p) => same(p["order_id"], order.id));
export const refundsOf = (data: DeskData, order: Row): Row[] => data.refunds.filter((r) => same(r["order_id"], order.id));
export const messagesOf = (data: DeskData, order: Row): Row[] => data.messages.filter((m) => same(m["order_id"], order.id));
export const codesOf = (data: DeskData, order: Row): Row[] => data.codes.filter((c) => same(c["order_id"], order.id) && text(c["removed_at"]) === null);
export const serviceOf = (data: DeskData, order: Row): Row | undefined => data.services.find((s) => same(s.id, order["service_id"]));
export const customerOf = (data: DeskData, order: Row): Row | undefined => data.customers.find((c) => same(c.id, order["customer_id"]));

/** Whether this person's reads of the order carry its money (the packer's do not: its limits leave the columns out). */
export const showsMoney = (order: Row): boolean => "total" in order;

/** The ways an order was paid, in the order a refund gives them back: online first, then the gift card, then a transfer. */
const METHOD_ORDER = ["online", "gift_card", "transfer"];
export function keptPayments(data: DeskData, order: Row): Row[] {
  return paymentsOf(data, order)
    .filter((p) => (num(p["kept"]) ?? 0) > 0)
    .sort((a, b) => METHOD_ORDER.indexOf(String(a["method"])) - METHOD_ORDER.indexOf(String(b["method"])) || Number(a.id) - Number(b.id));
}

/**
 * One refund row per payment (OFF-6): what is given back, online first, then
 * the gift card, then a transfer, each up to what that payment still keeps.
 * The amounts are the person's figure laid over the stored `kept` of each
 * payment; Adminium refuses a row past what its payment holds.
 */
export function splitRefund(data: DeskData, order: Row, cents: number): { payment: Row; cents: number }[] {
  const out: { payment: Row; cents: number }[] = [];
  let left = cents;
  for (const payment of keptPayments(data, order)) {
    if (left <= 0) break;
    const holds = Math.round((num(payment["kept"]) ?? 0) * 100);
    const take = Math.min(holds, left);
    if (take > 0) out.push({ payment, cents: take });
    left -= take;
  }
  return out;
}

/** The provider's name as people know it, from the stored provider key. */
export function providerName(provider: unknown): string | null {
  const p = text(provider);
  if (p === null) return null;
  const known: Record<string, string> = { stripe: "Stripe", paypal: "PayPal", square: "Square" };
  return known[p.toLowerCase()] ?? p.charAt(0).toUpperCase() + p.slice(1);
}

/** How an order's money stands, as a chip: its word and tone, and how it was paid. */
export type PayState = "paid" | "part-refunded" | "refunded" | "unpaid" | "owed";
export function payState(order: Row): PayState {
  const paid = num(order["paid"]) ?? 0;
  const refunded = num(order["refunded"]) ?? 0;
  const s = status(order);
  if (s === "cancelled") return paid > 0 ? "owed" : refunded > 0 ? "refunded" : "unpaid";
  if (s === "paying" || s === "awaiting_transfer") return "unpaid";
  if (paid <= 0) return refunded > 0 ? "refunded" : "unpaid";
  return refunded > 0 ? "part-refunded" : "paid";
}

/** The way an order was paid, in words: "Online · Stripe", "Bank transfer", "Gift card"; null before any payment. */
export function wayPaid(data: DeskData, order: Row): { method: string; provider: string | null } | null {
  const first = paymentsOf(data, order).sort((a, b) => METHOD_ORDER.indexOf(String(a["method"])) - METHOD_ORDER.indexOf(String(b["method"])))[0];
  if (first === undefined) return null;
  return { method: text(first["method"]) ?? "online", provider: providerName(first["provider"]) };
}

/** The orders as Orders filters them (K2): status, service, paid or not, a search over number, name or e-mail. */
export function filterOrders(data: DeskData, filter: { status: string; service: string; paid: string }, query = ""): Row[] {
  const q = query.trim().toLowerCase();
  return data.orders.filter((o) => {
    if (filter.status !== "all" && status(o) !== filter.status) return false;
    if (filter.service !== "all" && !same(o["service_id"], filter.service)) return false;
    if (filter.paid === "paid" && !((num(o["paid"]) ?? 0) > 0)) return false;
    if (filter.paid === "unpaid" && (num(o["paid"]) ?? 0) > 0) return false;
    if (filter.paid === "owed" && !(status(o) === "cancelled" && (num(o["paid"]) ?? 0) > 0)) return false;
    if (q !== "" && ![o["number"], o["name"], o["email"]].some((v) => (text(v) ?? "").toLowerCase().includes(q))) return false;
    return true;
  });
}

/** An order never shipped by a parcel has no ship-by (N2-F4): a gift-cards-only order, a cancelled one. */
export function shipsByOf(order: Row): string | null {
  if (isGift(order) || status(order) === "cancelled") return null;
  return text(order["ships_by"]);
}

/** The order's moves the screen offers this person (K3), as Adminium's states and the role allow. */
export function orderMoves(order: Row, who: Person): { packed: boolean; shipped: boolean; cancel: boolean; markPaid: boolean; unpack: boolean } {
  const s = status(order);
  const owner = isOwner(who);
  const updates = who.can("orders", "update");
  return {
    packed: updates && s === "paid" && !isGift(order),
    shipped: updates && s === "packed",
    unpack: updates && s === "packed",
    // No cancel while the customer is paying (R3): the clock cancels it. Never once shipped. A sent gift card: its recall.
    cancel: owner && updates && ["awaiting_transfer", "paid", "sent"].includes(s),
    // A bank transfer the owner records: on an order waiting for one, or a late one on a cancelled order.
    markPaid: owner && who.can("payments", "create") && (s === "awaiting_transfer" || (s === "cancelled" && text(order["pay_method"]) === "transfer" && (num(order["paid"]) ?? 0) <= 0 && text(order["cancel_reason"]) === "unpaid")),
  };
}

// ── search (topbar) ─────────────────────────────────────────────────────────

export interface Hits {
  orders: Row[];
  customers: Row[];
  variants: Row[];
}
/** Orders by number, name or e-mail; customers by name or e-mail; variants by SKU. Two characters at least. */
export function search(data: DeskData, query: string, limit = 5): Hits {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return { orders: [], customers: [], variants: [] };
  const has = (v: unknown) => (text(v) ?? "").toLowerCase().includes(q);
  return {
    orders: data.orders.filter((o) => has(o["number"]) || has(o["name"]) || has(o["email"])).slice(0, limit),
    customers: data.customers.filter((c) => has(c["name"]) || has(c["email"])).slice(0, limit),
    variants: data.variants.filter((v) => has(v["sku"])).slice(0, limit),
  };
}

// ── stock ───────────────────────────────────────────────────────────────────

export interface Stock {
  /** Inventory's item for the variant; null when nothing counts it (STK-5). */
  itemId: Id | null;
  onHand: number;
  held: number;
  available: number;
  /** Inventory's words: `in`, `low`, `out`. */
  state: "in" | "low" | "out";
  /** The places it is kept, by name, when Inventory has more than one or names one. */
  places: string[];
}

/** A variant's stock as Inventory keeps it, summed over its places; null when Inventory is off or nothing counts the variant. */
export function stockOf(data: DeskData, variantId: unknown): Stock | null {
  const stock = data.stock;
  if (stock === null) return null;
  const link = stock.links.find((l) => same(l["source_row"], variantId) && (text(l["kind"]) ?? "item") === "item");
  if (link === undefined) return null;
  const points = stock.points.filter((p) => same(p["item_id"], link["item_id"]));
  const sum = (column: string) => points.reduce((n, p) => n + (num(p[column]) ?? 0), 0);
  const states = points.map((p) => text(p["state"]) ?? "in");
  const available = sum("available");
  const state: Stock["state"] = points.length === 0 || available <= 0 ? "out" : states.includes("low") ? "low" : states.every((s) => s === "out") ? "out" : "in";
  const places = points.map((p) => text(stock.places.find((pl) => same(pl.id, p["place_id"]))?.["name"])).filter((n): n is string => n !== null);
  return { itemId: link["item_id"] as Id, onHand: sum("on_hand"), held: sum("held"), available, state, places };
}

/** The shop's active variants on sale whose stock is low, and those sold out (K6's tabs, Today's tile). */
export function stockLists(data: DeskData): { low: Row[]; out: Row[] } {
  const low: Row[] = [];
  const out: Row[] = [];
  for (const v of data.variants) {
    if (v["active"] === false || (text(v["product_status"]) ?? "active") !== "active") continue;
    const s = stockOf(data, v.id);
    if (s === null) {
      if (data.stock === null && v["sold_out"] === true) out.push(v);
      continue;
    }
    if (s.state === "out") out.push(v);
    else if (s.state === "low") low.push(v);
  }
  return { low, out };
}

// ── the pick list (K4) ──────────────────────────────────────────────────────

export interface Pick {
  sku: string;
  productName: string;
  variantLabel: string;
  qty: number;
  variantId: unknown;
  /** Inventory's on-hand is below what is held for it: someone counts it before packing (STK-9). */
  short: boolean;
  places: string[];
}

/** The pieces to pick for the orders still to pack, by SKU, in the orders' order; a packed order's lines leave it (N2-F10). */
export function pickList(data: DeskData): Pick[] {
  const bySku = new Map<string, Pick>();
  for (const order of toPack(data)) {
    for (const line of linesOf(data, order)) {
      const sku = text(line["sku"]) ?? "";
      const qty = num(line["qty"]) ?? 0;
      const had = bySku.get(sku);
      if (had !== undefined) {
        had.qty += qty;
        continue;
      }
      const stock = stockOf(data, line["variant_id"]);
      bySku.set(sku, {
        sku,
        productName: text(line["product_name"]) ?? "",
        variantLabel: [text(line["colour"]), text(line["size"])].filter((x): x is string => x !== null).join(" · "),
        qty,
        variantId: line["variant_id"],
        short: stock !== null && stock.onHand < stock.held,
        places: stock?.places ?? [],
      });
    }
  }
  return [...bySku.values()];
}

// ── returns (K5) ────────────────────────────────────────────────────────────

export const returnStatus = (ret: Row): string => text(ret["status"]) ?? "asked";
export const returnLinesOf = (data: DeskData, ret: Row): Row[] => data.returnLines.filter((l) => same(l["return_id"], ret.id));
export function returnsIn(data: DeskData, ...states: string[]): Row[] {
  return data.returns.filter((r) => states.includes(returnStatus(r)));
}

// ── reviews (K8) ────────────────────────────────────────────────────────────

export const reviewState = (review: Row): string => text(review["state"]) ?? "waiting";
export function reviewsIn(data: DeskData, state: string): Row[] {
  return (data.reviews?.reviews ?? []).filter((r) => reviewState(r) === state);
}
/** A product's published reviews, as Forms & surveys counts them: how many, and their stars' sum. */
export function totalsOf(data: DeskData, productId: unknown): { count: number; sum: number } | null {
  const row = (data.reviews?.totals ?? []).find((t) => same(t["about_key"], productId));
  if (row === undefined) return null;
  return { count: num(row["count"]) ?? 0, sum: num(row["sum"]) ?? 0 };
}
/** The order a review came from: the order of the line it is about. */
export function orderOfReview(data: DeskData, review: Row): Row | undefined {
  const line = data.lines.find((l) => same(l.id, review["subject_key"]));
  return line === undefined ? undefined : data.orders.find((o) => same(o.id, line["order_id"]));
}

// ── products (K6, K7) ───────────────────────────────────────────────────────

export const optionsOf = (data: DeskData, product: Row, kind: "colour" | "size"): Row[] =>
  data.optionValues.filter((o) => same(o["product_id"], product.id) && text(o["kind"]) === kind).sort((a, b) => (num(a["position"]) ?? 0) - (num(b["position"]) ?? 0));
export const variantsOf = (data: DeskData, product: Row): Row[] => data.variants.filter((v) => same(v["product_id"], product.id));

/** The variants grid: one row per colour and size, made or not (a product with no sizes or colours has one axis). */
export function grid(data: DeskData, product: Row): { colour: Row | null; size: Row | null; variant: Row | null }[] {
  const colours = optionsOf(data, product, "colour");
  const sizes = optionsOf(data, product, "size");
  const vs = variantsOf(data, product);
  const out: { colour: Row | null; size: Row | null; variant: Row | null }[] = [];
  for (const colour of colours.length > 0 ? colours : [null]) {
    for (const size of sizes.length > 0 ? sizes : [null]) {
      const variant = vs.find((v) => same(v["colour_id"] ?? null, colour?.id ?? null) && same(v["size_id"] ?? null, size?.id ?? null)) ?? vs.find((v) => (colour === null || same(v["colour_id"], colour.id)) && (size === null || same(v["size_id"], size.id))) ?? null;
      out.push({ colour, size, variant });
    }
  }
  return out;
}

/** A product's stock in words over its active variants: how many sold out, how many low. */
export function productStock(data: DeskData, product: Row): { out: number; low: number } | null {
  if (data.stock === null) return null;
  let out = 0;
  let low = 0;
  for (const v of variantsOf(data, product)) {
    if (v["active"] === false) continue;
    const s = stockOf(data, v.id);
    if (s === null) continue;
    if (s.state === "out") out += 1;
    else if (s.state === "low") low += 1;
  }
  return { out, low };
}

/**
 * A SKU for a new variant, from its siblings': the product's part of their
 * SKU with the new colour's and size's codes. The owner sees it and the
 * variant's SKU is the truth from then on.
 */
export function skuFor(data: DeskData, product: Row, colour: Row | null, size: Row | null): string {
  const sibling = variantsOf(data, product)[0];
  const sku = text(sibling?.["sku"]) ?? `NL-${(text(product["slug"]) ?? "ITEM").toUpperCase()}`;
  const parts = sku.split("-");
  const stem = parts.slice(0, Math.max(2, parts.length - ((sibling?.["colour_id"] ? 1 : 0) + (sibling?.["size_id"] ? 1 : 0)))).join("-");
  const code = (o: Row | null) => (o === null ? null : (text(o["code"]) ?? "").toUpperCase().slice(0, 3));
  return [stem, code(colour), code(size)].filter((x): x is string => x !== null && x !== "").join("-");
}

// ── customers (K9) ──────────────────────────────────────────────────────────

export const ordersOfCustomer = (data: DeskData, customer: Row): Row[] => data.orders.filter((o) => same(o["customer_id"], customer.id));
export const returnsOfCustomer = (data: DeskData, customer: Row): Row[] => data.returns.filter((r) => same(r["customer_id"], customer.id));
/** Where a customer lives, by their newest order with an address. */
export function townOf(data: DeskData, customer: Row): Row | undefined {
  return ordersOfCustomer(data, customer).find((o) => text(o["city"]) !== null);
}
