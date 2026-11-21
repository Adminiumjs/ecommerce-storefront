/**
 * A small Northline for the desk's tests, its figures as Adminium stores
 * them (the sample's `figures.md`): the five paid orders to pack, two packed,
 * one being paid, a gift-cards-only order sent, one cancelled unpaid, one
 * waiting for a bank transfer; the four returns at their four steps; Basalt
 * Rain Shell's variants grid with its Ember / XS hole; Inventory's stock with
 * one line short; Forms' reviews. The packer's copy is the same shop read
 * through the packer's column limits: no money, no e-mail, no payments,
 * refunds, customers, messages or reviews.
 */
import type { DeskData } from "../door.ts";
import type { Row } from "../wire.ts";
import { PACKER_LINE_READS, PACKER_ORDER_READS } from "../../manifest/roles.ts";

const at = (day: string, time: string) => new Date(`${day}T${time}:00-07:00`).toISOString();

const settings: Row = {
  id: 1,
  shop_name: "Northline",
  email: "hello@northline.example",
  phone: null,
  address_line1: "1400 NW Kearney St, Suite 210",
  address_line2: null,
  city: "Portland",
  state_code: "OR",
  zip: "97209",
  ref_prefix: "NL-",
  first_number: 1001,
  pay_hold_minutes: 30,
  transfer_on: true,
  transfer_name: "Northline Outdoor LLC",
  transfer_bank: "Sample Savings Bank",
  transfer_routing: "012345678",
  transfer_account: "000123456789",
  transfer_days: 5,
  return_days: 30,
  refund_shipping_faulty: true,
  promise_1: "Free Standard shipping from $100",
  about: "A small outdoor-gear shop.",
  privacy: null,
  terms: null,
  review_link: null,
};

const services: Row[] = [
  { id: 1, code: "standard", label: "Standard", transit_min: 3, transit_max: 5, dhl_product: "N", active: true, position: 1 },
  { id: 2, code: "express", label: "Express", transit_min: 2, transit_max: 2, dhl_product: "P", active: true, position: 2 },
  { id: 3, code: "overnight", label: "Overnight", transit_min: 1, transit_max: 1, dhl_product: "U", active: true, position: 3 },
];
const zones: Row[] = [
  { id: 1, code: "contiguous", label: "Contiguous US" },
  { id: 2, code: "remote", label: "Alaska & Hawaii" },
];
const offers: Row[] = [
  { id: 1, service_id: 1, zone_id: 1, price: "7.00", free_from: "100.00", active: true },
  { id: 2, service_id: 1, zone_id: 2, price: "16.00", free_from: null, active: true },
  { id: 3, service_id: 2, zone_id: 1, price: "18.00", free_from: null, active: true },
  { id: 4, service_id: 3, zone_id: 1, price: "35.00", free_from: null, active: true },
];
const regions: Row[] = [
  { id: 1, code: "OR", name: "Oregon", zone_id: 1, tax_rate: "0.000", active: true },
  { id: 2, code: "WA", name: "Washington", zone_id: 1, tax_rate: "6.500", active: true },
  { id: 3, code: "CA", name: "California", zone_id: 1, tax_rate: "7.250", active: true },
];

const categories: Row[] = [
  { id: 1, name: "Packs", slug: "packs" },
  { id: 2, name: "Clothing", slug: "clothing" },
];
const products: Row[] = [
  { id: 1, name: "Basalt Rain Shell", slug: "basalt-shell", category_id: 2, category_name: "Clothing", price: "189.00", blurb: "Three layers.", description: null, specs: [{ label: "Fabric", value: "3L nylon" }], size_guide_id: 1, size_name: "Size", featured: true, new_until: null, status: "active", variants_count: 9 },
  { id: 2, name: "Cascade 45 Trekking Pack", slug: "cascade-45", category_id: 1, category_name: "Packs", price: "219.00", blurb: "A 45-litre pack.", description: null, specs: [], size_guide_id: null, size_name: "Back", featured: false, new_until: null, status: "active", variants_count: 1 },
];
const optionValues: Row[] = [
  { id: 11, product_id: 1, kind: "colour", code: "slate", label: "Slate", hex: "#4b5563", position: 1 },
  { id: 12, product_id: 1, kind: "colour", code: "ember", label: "Ember", hex: "#b4472a", position: 2 },
  ...["XS", "S", "M", "L", "XL"].map((label, i) => ({ id: 20 + i, product_id: 1, kind: "size", code: label.toLowerCase(), label, hex: null, position: i + 1 })),
  { id: 31, product_id: 2, kind: "colour", code: "moss", label: "Moss", hex: "#5f7a4a", position: 1 },
  { id: 32, product_id: 2, kind: "size", code: "m-l", label: "M/L", hex: null, position: 1 },
];
const variant = (id: number, productId: number, colour: Row, size: Row, sku: string, delta: string | null, more: Row | object = {}): Row => ({
  id,
  product_id: productId,
  colour_id: colour.id,
  size_id: size.id,
  colour_label: colour["label"],
  size_label: size["label"],
  sku,
  price_delta: delta,
  weight_g: 380,
  active: true,
  sold_out: false,
  product_name: productId === 1 ? "Basalt Rain Shell" : "Cascade 45 Trekking Pack",
  product_status: "active",
  ...more,
});
const ov = (id: number) => optionValues.find((o) => o.id === id)!;
const variants: Row[] = [
  ...[20, 21, 22, 23, 24].map((s, i) => variant(100 + i, 1, ov(11), ov(s), `NL-BSH-SLA-${String(ov(s)["label"])}`, ov(s)["label"] === "XL" ? "10.00" : null)),
  // Ember: no XS made.
  ...[21, 22, 23, 24].map((s, i) => variant(110 + i, 1, ov(12), ov(s), `NL-BSH-EMB-${String(ov(s)["label"])}`, ov(s)["label"] === "XL" ? "10.00" : null)),
  variant(200, 2, ov(31), ov(32), "NL-CAS45-MOS-ML", null, { weight_g: 1450 }),
];

/** Inventory: an item per variant; Slate XL sold out, Ember M low, the Cascade short (on hand below what is held). */
const stockOf: Record<number, { on: number; held: number; available: number; state: string }> = {
  104: { on: 0, held: 0, available: 0, state: "out" },
  111: { on: 4, held: 1, available: 3, state: "low" },
  200: { on: 0, held: 1, available: 0, state: "out" },
};
const stock = {
  items: variants.map((v) => ({ id: 1000 + Number(v.id), name: v["sku"], sku: v["sku"], active: true })),
  links: variants.map((v) => ({ id: 2000 + Number(v.id), source_table: "ecommerce_shop_variants", source_row: v.id, kind: "item", item_id: 1000 + Number(v.id), qty: 1 })),
  places: [{ id: 1, name: "Stockroom" }],
  points: variants.map((v) => {
    const s = stockOf[Number(v.id)] ?? { on: 12, held: 0, available: 12, state: "in" };
    return { id: 3000 + Number(v.id), item_id: 1000 + Number(v.id), place_id: 1, on_hand: s.on, held: s.held, available: s.available, state: s.state };
  }),
};

interface OrderSpec {
  id: number;
  number: string;
  status: string;
  name: string;
  email: string;
  city: string;
  state: string;
  service: number | null;
  placed: string;
  paid?: string | null;
  money: { goods: string; discount: string; shipping: string; tax: string; total: string; paid: string; due: string; refunded?: string; gifts?: string };
  kind?: "goods" | "gift";
  more?: Row | object;
}
const order = (o: OrderSpec): Row => ({
  id: o.id,
  number: o.number,
  status: o.status,
  kind: o.kind ?? "goods",
  pay_method: "online",
  customer_id: o.number === "NL-1066" ? 1 : null,
  name: o.name,
  email: o.email,
  ship_name: o.kind === "gift" ? null : o.name,
  address_line1: o.kind === "gift" ? null : "4791 Spruce Way",
  address_line2: null,
  city: o.kind === "gift" ? null : o.city,
  zip: o.kind === "gift" ? null : "98103",
  state_code: o.state,
  tax_rate: o.state === "WA" ? "6.500" : "0.000",
  service_id: o.service,
  pieces: o.kind === "gift" ? 0 : 1,
  weight_g: 1450,
  placed_at: o.placed,
  paid_at: o.paid ?? null,
  ships_by: o.paid === undefined || o.paid === null ? null : o.paid.slice(0, 10),
  stock_until: "2026-10-02T17:05:00.000Z",
  goods: o.money.goods,
  discount: o.money.discount,
  shipping: o.money.shipping,
  tax: o.money.tax,
  gifts: o.money.gifts ?? "0.00",
  total: o.money.total,
  paid: o.money.paid,
  due: o.money.due,
  refunded: o.money.refunded ?? "0.00",
  pay_by: null,
  transfer_by: null,
  carrier: null,
  tracking: null,
  staff_note: null,
  ...o.more,
});
const zero = { goods: "0.00", discount: "0.00", shipping: "0.00", tax: "0.00", total: "0.00", paid: "0.00", due: "0.00" };
const orders: Row[] = [
  order({ id: 70, number: "NL-1070", status: "awaiting_transfer", name: "Owen Price", email: "owen.p@example.com", city: "Portland", state: "OR", service: 1, placed: at("2026-08-18", "11:20"), money: { goods: "68.00", discount: "0.00", shipping: "7.00", tax: "0.00", total: "75.00", paid: "0.00", due: "75.00" }, more: { pay_method: "transfer", transfer_by: "2026-08-25" } }),
  order({ id: 66, number: "NL-1066", status: "paying", name: "Priya Raman", email: "priya.r@example.com", city: "Portland", state: "OR", service: 1, placed: at("2026-08-18", "11:31"), money: { goods: "217.00", discount: "0.00", shipping: "0.00", tax: "0.00", total: "217.00", paid: "0.00", due: "217.00" }, more: { pay_by: at("2026-08-18", "12:01") } }),
  order({ id: 65, number: "NL-1065", status: "paid", name: "Marcus Hale", email: "marcus.h@example.com", city: "Seattle", state: "WA", service: 2, placed: at("2026-08-18", "10:05"), paid: at("2026-08-18", "10:06"), money: { goods: "219.00", discount: "32.85", shipping: "18.00", tax: "12.10", total: "216.25", paid: "216.25", due: "0.00" } }),
  order({ id: 61, number: "NL-1061", status: "paid", name: "Ruth Ellison", email: "ruth.e@example.com", city: "Anchorage", state: "AK", service: 1, placed: at("2026-08-17", "16:40"), paid: at("2026-08-17", "16:41"), money: { goods: "89.00", discount: "0.00", shipping: "16.00", tax: "0.00", total: "105.00", paid: "105.00", due: "0.00" } }),
  order({ id: 59, number: "NL-1059", status: "packed", name: "Ines Duarte", email: "ines.d@example.com", city: "Denver", state: "CO", service: 2, placed: at("2026-08-17", "14:40"), paid: at("2026-08-17", "14:41"), money: { goods: "168.00", discount: "19.35", shipping: "18.00", tax: "0.00", total: "166.65", paid: "166.65", due: "0.00" }, more: { packed_at: at("2026-08-18", "09:00"), packed_by: "Casey Moll" } }),
  order({ id: 58, number: "NL-1058", status: "cancelled", name: "Sam Whitaker", email: "sam.w@example.com", city: "Portland", state: "OR", service: 1, placed: at("2026-08-17", "09:40"), money: { ...zero, goods: "149.00", total: "149.00", due: "149.00" }, more: { cancel_reason: "unpaid", cancelled_at: at("2026-08-17", "10:10") } }),
  order({ id: 13, number: "NL-1013", status: "sent", kind: "gift", name: "Leo Fischer", email: "leo.f@example.com", city: "", state: "WA", service: null, placed: at("2026-07-27", "19:12"), paid: at("2026-07-27", "19:13"), money: { ...zero, gifts: "100.00", total: "100.00", paid: "100.00" } }),
  order({ id: 5, number: "NL-1005", status: "shipped", name: "Zoe Carter", email: "zoe.c@example.com", city: "San Diego", state: "CA", service: 1, placed: at("2026-07-23", "10:00"), paid: at("2026-07-23", "10:01"), money: { goods: "189.00", discount: "0.00", shipping: "0.00", tax: "13.70", total: "202.70", paid: "202.70", due: "0.00" }, more: { carrier: "USPS", tracking: "9400100000000000000005", shipped_at: at("2026-07-24", "15:00") } }),
  order({ id: 8, number: "NL-1008", status: "shipped", name: "Grace Okafor", email: "grace.o@example.com", city: "Oakland", state: "CA", service: 3, placed: at("2026-07-24", "10:00"), paid: at("2026-07-24", "10:01"), money: { goods: "58.00", discount: "0.00", shipping: "35.00", tax: "4.21", total: "97.21", paid: "97.21", due: "0.00" } }),
];
const line = (id: number, orderId: number, variantId: number, qty: number, each: string, more: Row | object = {}): Row => {
  const v = variants.find((x) => x.id === variantId)!;
  return { id, order_id: orderId, variant_id: variantId, qty, sku: v["sku"], product_id: v["product_id"], product_name: v["product_name"], colour: v["colour_label"], size: v["size_label"], variant_label: `${String(v["colour_label"])} · ${String(v["size_label"])}`, weight_g: v["weight_g"], each, line: (Number(each) * qty).toFixed(2), discount: "0.00", ...more };
};
const lines: Row[] = [
  line(1, 65, 200, 1, "219.00", { discount: "32.85" }),
  line(2, 61, 102, 1, "189.00"),
  line(3, 61, 200, 1, "219.00"),
  line(4, 59, 112, 1, "189.00"),
  line(5, 66, 112, 1, "189.00"),
  line(6, 58, 101, 1, "189.00"),
  line(7, 5, 110, 1, "189.00"),
  line(8, 8, 103, 1, "58.00"),
  line(9, 70, 100, 1, "68.00"),
];
const payments: Row[] = [
  { id: 1, order_id: 65, method: "online", amount: "216.25", kept: "216.25", returned: "0.00", provider: "stripe", paid_at: at("2026-08-18", "10:06") },
  { id: 2, order_id: 61, method: "online", amount: "105.00", kept: "105.00", returned: "0.00", provider: "stripe", paid_at: at("2026-08-17", "16:41") },
  { id: 3, order_id: 59, method: "online", amount: "166.65", kept: "166.65", returned: "0.00", provider: "paypal", paid_at: at("2026-08-17", "14:41") },
  { id: 4, order_id: 13, method: "online", amount: "100.00", kept: "100.00", returned: "0.00", provider: "stripe", paid_at: at("2026-07-27", "19:13") },
  { id: 5, order_id: 5, method: "online", amount: "202.70", kept: "202.70", returned: "0.00", provider: "paypal", paid_at: at("2026-07-23", "10:01") },
  { id: 6, order_id: 8, method: "online", amount: "97.21", kept: "97.21", returned: "0.00", provider: "stripe", paid_at: at("2026-07-24", "10:01") },
];
const returns: Row[] = [
  { id: 4, number: "RT-1004", order_id: 8, order_number: "NL-1008", customer_id: null, status: "asked", reason: "mind", note: "Changed my mind about the colour.", asked_at: at("2026-08-17", "12:00"), refund_amount: "62.21", refund_short: "62.21", refunded_total: "0.00", shipping_refund: null },
  { id: 3, number: "RT-1003", order_id: 8, order_number: "NL-1008", customer_id: null, status: "approved", reason: "faulty", note: null, asked_at: at("2026-08-14", "12:00"), refund_amount: "62.21", refund_short: "62.21", refunded_total: "0.00", shipping_refund: null },
  { id: 2, number: "RT-1002", order_id: 5, order_number: "NL-1005", customer_id: null, status: "received", reason: "expected", note: null, asked_at: at("2026-08-10", "12:00"), refund_amount: "202.70", refund_short: "202.70", refunded_total: "0.00", shipping_refund: null },
];
const returnLines: Row[] = [
  { id: 41, return_id: 4, line_id: 8, qty: 1, sku: "NL-BSH-SLA-L", product_name: "Basalt Rain Shell", variant_label: "Slate · L", restock: true, refund: "62.21" },
  { id: 31, return_id: 3, line_id: 8, qty: 1, sku: "NL-BSH-SLA-L", product_name: "Basalt Rain Shell", variant_label: "Slate · L", restock: true, refund: "62.21" },
  { id: 21, return_id: 2, line_id: 7, qty: 1, sku: "NL-BSH-EMB-S", product_name: "Basalt Rain Shell", variant_label: "Ember · S", restock: true, refund: "202.70" },
];
const customers: Row[] = [{ id: 1, email: "priya.r@example.com", name: "Priya Raman", news: true, news_since: at("2026-03-02", "09:00"), orders_count: 1, forgotten_at: null }];
const messages: Row[] = [{ id: 1, kind: "order-paid", status: "sent", to_address: "marcus.h@example.com", order_id: 65, created_at: at("2026-08-18", "10:06"), sent_at: at("2026-08-18", "10:06") }];
const reviews = {
  reviews: [
    { id: 1, app: "ecommerce-shop", subject_table: "order_lines", subject_key: "8", about_table: "products", about_key: "1", about_name: "Basalt Rain Shell", about_detail: "Slate · L", stars: 5, title: "Exactly right", body: "Kept me dry all day.", shown_name: "Grace O.", state: "waiting", hide_reason: null, reply: null, submitted_at: at("2026-08-17", "08:00") },
    { id: 2, app: "ecommerce-shop", subject_table: "order_lines", subject_key: "7", about_table: "products", about_key: "1", about_name: "Basalt Rain Shell", about_detail: "Ember · S", stars: 3, title: "Fine", body: "Runs small.", shown_name: "Zoe C.", state: "published", hide_reason: null, reply: "Thanks, Zoe.", submitted_at: at("2026-08-01", "08:00") },
  ],
  totals: [{ id: 1, app: "ecommerce-shop", about_table: "products", about_key: "1", count: 1, sum: 3 }],
};

/** The owner's Northline. */
export function ownerData(): DeskData {
  return structuredClone({
    settings,
    categories,
    sizeGuides: [{ id: 1, name: "Apparel" }],
    products,
    optionValues,
    pictures: [],
    variants,
    zones,
    regions,
    services,
    offers,
    closures: [{ id: 1, from_date: "2026-09-07", to_date: "2026-09-07", reason: "Labor Day", active: true }],
    customers,
    orders,
    lines,
    giftLines: [{ id: 1, order_id: 13, amount: "100.00", to_name: "Hana Sato", to_email: "hana.s@example.com" }],
    codes: [{ id: 1, order_id: 65, typed: "TRAIL15", removed_at: null }],
    payments,
    refunds: [],
    returns,
    returnLines,
    messages,
    stock,
    reviews,
  });
}

/** The same shop as the packer reads it: the role's column lists, and nothing it holds no grant on. */
export function packerData(): DeskData {
  const owner = ownerData();
  const pick = (row: Row, keep: readonly string[]): Row => Object.fromEntries(Object.entries(row).filter(([k]) => keep.includes(k))) as Row;
  const RETURN_READS = ["id", "number", "order_id", "order_number", "status", "reason", "note", "tracking", "staff_note", "asked_at", "approved_at", "received_at", "received_by"];
  return {
    ...owner,
    orders: owner.orders.map((o) => pick(o, PACKER_ORDER_READS)),
    lines: owner.lines.map((l) => pick(l, [...PACKER_LINE_READS, "colour", "size"])),
    variants: owner.variants.map((v) => pick(v, ["id", "product_id", "colour_id", "size_id", "colour_label", "size_label", "sku", "weight_g", "active", "sold_out", "product_name", "product_status"])),
    products: owner.products.map((p) => pick(p, ["id", "name", "slug", "category_id", "category_name", "size_guide_id", "size_name", "status"])),
    returns: owner.returns.map((r) => pick(r, RETURN_READS)),
    returnLines: owner.returnLines.map((l) => pick(l, ["id", "return_id", "line_id", "qty", "sku", "product_name", "variant_label", "restock", "void_at"])),
    customers: [],
    giftLines: [],
    codes: [],
    payments: [],
    refunds: [],
    messages: [],
    reviews: null,
  };
}
