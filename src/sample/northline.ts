/**
 * Northline's Tuesday: the one source of the app's sample data.
 *
 * `npm run sample` writes two files from this module:
 *
 *   seeds/ecommerce-shop.sample.json            the shop itself: its settings,
 *                                                catalogue, shipping, closures,
 *                                                customers, their 66 orders with
 *                                                their payments, returns and
 *                                                refunds, a message and two
 *                                                back-in-stock requests;
 *   seeds/ecommerce-shop.inventory.sample.json  the shop's rows for Inventory:
 *                                                a stock item per variant, the
 *                                                link that says which variant
 *                                                uses it, and the opening stock,
 *                                                posted by Inventory itself.
 *
 * The world is `northline-data.json`, written by the same generator as
 * `figures.md`: every figure here is read from it, never typed again. What the
 * world does not say and a row cannot do without (when an order was packed, a
 * return approved, a product added) is worked out by one rule below, each
 * named where it is used.
 *
 * Every figure the screens show is Adminium's: a line's price and total, an
 * order's goods, tax, shipping and total, what a return gives back. A sample
 * row writes only what a person or the shopper would have typed or picked,
 * and the moments a stamp would have written: sample data is history, and
 * Adminium never stamps history, so an order shipped weeks ago carries its own
 * `shipped_at`. Codes and gift cards are Offers' to decide: a sample line
 * names no reduction, so without Offers the two orders with a code read their
 * full price. Reviews are Forms', and no app may ship them (see the end).
 *
 * The shop's clock is pinned to Tuesday 18 August 2026, 11:40 in Portland, as
 * the designs draw it. A moment more than three days before it (an order
 * shipped last week) is a `@week` moment, on its weekday in the week nearest
 * the adding day, so no parcel goes on a Saturday and the weeks of the sales
 * chart still start on a Tuesday; such a moment is four days or more before
 * the week's Tuesday, and the adding day at most three days before it, so it
 * has always passed. A moment of the last three days counts back from the
 * adding day (`@day`, or `@ago` today), so it never lands after it. A day the
 * shop plans by (a ships-by date, the Labor Day closure) keeps its weekday.
 *
 * The orders carry their own numbers (NL-1001 to NL-1066) and no running
 * number, so the shop's own next order is NL-1067. Every address ends in
 * `example.com`, which nobody receives mail for.
 */
import { readFileSync } from "node:fs";

import { SETTINGS as APP_SETTINGS, SHIP_DAYS as SHIP_DAYS_KEY } from "../manifest/settings.ts";

type Value = unknown;
type Row = Record<string, Value>;
interface Table {
  ref: string;
  own?: true;
  onlyIfEmpty?: true;
  rows: Row[];
}
interface Move {
  ref?: string;
  table?: string;
  to: string;
}
export interface SampleBundle {
  format: "adminium.sample/1";
  app: "ecommerce-shop";
  addOn?: "inventory";
  weekAnchor: "tue";
  tables: Table[];
  moves?: Move[];
}

// ── the world ───────────────────────────────────────────────────────────────

interface OptionValue {
  id: string;
  label: string;
  hex?: string;
}
interface Product {
  id: string;
  name: string;
  cat: string;
  price: string;
  weight: number;
  blurb: string;
  feat: boolean;
  specs: [string, string][];
  guide: string | null;
  new: boolean;
  options: { key: "colour" | "size"; name: string; type: string; values: OptionValue[] }[];
  description: string | null;
  newUntil: string | null;
}
interface Variant {
  sku: string;
  product: string;
  colour: string | null;
  size: string | null;
  price: string;
  weightG: number;
  onHand: number;
  reserved: number;
  available: number;
}
interface Customer {
  id: number;
  name: string;
  email: string;
  city: string;
  state: string;
  zip: string;
  line1: string;
  account: boolean;
  news: boolean;
  newsAgreed?: string;
}
export type WorldState = "paying" | "paid" | "packed" | "shipped" | "gift_sent" | "cancelled_unpaid" | "cancelled_customer" | "cancelled_staff";
export interface WorldOrder {
  number: string;
  placed: string;
  customer: number;
  name: string;
  email: string;
  ship: { line1: string; city: string; state: string; zip: string };
  service: string | null;
  code: string | null;
  state: WorldState;
  paidAt: string | null;
  method: string | null;
  shipsBy: string | null;
  shippedOn: string | null;
  arrives: [string, string] | null;
  tracking: string | null;
  lines: { sku: string; qty: number; each: string; line: string; discount: string; tax: string }[];
  gifts: { amount: string; to: string; toEmail: string; message: string }[];
  goods: string;
  discount: string;
  net: string;
  shipping: string;
  tax: string;
  giftsTotal: string;
  total: string;
}
interface Return {
  number: string;
  order: string;
  sku: string;
  qty: number;
  reason: string;
  step: "asked" | "approved" | "received" | "refunded";
  asked: string;
  amount: string;
}
interface Service {
  id: string;
  label: string;
  days: [number, number];
  bands: Record<string, { min: string; price: string }[]>;
}
export interface World {
  NOW: { iso: string; time: string };
  SHOP: {
    name: string;
    line1: string;
    city: string;
    state: string;
    zip: string;
    email: string;
    prefix: string;
    cutoff: string;
    payHoldMinutes: number;
    transferDays: number;
    returnDays: number;
    transfer: { accountName: string; bank: string; routing: string; account: string };
    carrier: { name: string; pickup: string };
    promises: string[];
    pages: { about: string[]; privacy: string[]; terms: string[] };
  };
  CATEGORIES: { id: string; name: string; icon: string }[];
  GUIDES: Record<string, { title: string; cols: string[]; rows: string[][] }>;
  PRODUCTS: Product[];
  VARIANTS: Variant[];
  ZONES: Record<string, string>;
  SERVICES: Service[];
  TAX: Record<string, number>;
  CLOSURES: { iso: string; name: string }[];
  GIFT_AMOUNTS: string[];
  CODES: Record<string, { percent: number; on: string | null }>;
  CUSTOMERS: Customer[];
  ORDERS: WorldOrder[];
  RETURNS: Return[];
  NEXT_NUMBER: string;
  PACKER: { name: string };
  SIGNED_IN_STAFF: { name: string };
}

export const WORLD = JSON.parse(readFileSync(new URL("./northline-data.json", import.meta.url), "utf8")) as World;
const { SHOP } = WORLD;

// ── the clock ───────────────────────────────────────────────────────────────

/** The day and time the sample is written for: Tuesday 18 August 2026, 11:40. */
export const TODAY = WORLD.NOW.iso;
export const NOW_TIME = WORLD.NOW.time;

const parse = (iso: string): Date => {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
};
const isoOf = (d: Date): string => d.toISOString().slice(0, 10);
export const addDays = (iso: string, n: number): string => {
  const d = parse(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return isoOf(d);
};
/** Days from the sample's Tuesday. */
export const offset = (iso: string): number => Math.round((parse(iso).getTime() - parse(TODAY).getTime()) / 86_400_000);
const minutesOf = (hm: string): number => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5));
const hm = (minutes: number): string => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
/** An ISO duration of so many minutes: PT9M, PT1H35M, PT2H. */
const span = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `PT${h > 0 ? `${String(h)}H` : ""}${m > 0 || h === 0 ? `${String(m)}M` : ""}`;
};
/** A world moment, "2026-07-21T09:02", moved on by so many minutes, across midnight when it must. */
export const addMinutes = (moment: string, minutes: number): string => {
  const total = minutesOf(moment.slice(11)) + minutes;
  const days = Math.floor(total / 1440);
  return `${addDays(moment.slice(0, 10), days)}T${hm(total - days * 1440)}`;
};

/** A day the shop plans by: on its weekday, in the week nearest the adding day. */
const week = (iso: string): Row => ({ "@day": offset(iso), "@week": true });
/** A moment more than three days back, on its weekday: never later than the adding day, whatever day that is. */
const history = (moment: string): Row => {
  if (offset(moment.slice(0, 10)) > -4) throw new Error(`${moment} is too near the sample's Tuesday to stand on its weekday and have passed`);
  return { "@day": offset(moment.slice(0, 10)), "@time": moment.slice(11), "@week": true };
};
/**
 * A moment of the last three days, or one still to come, counted from the
 * adding day: today's as so long from 11:40 (a sample added at nine never
 * holds an order placed at 11:31 that has not come yet), another day's at its
 * wall time.
 */
const recent = (moment: string): Row => {
  const iso = moment.slice(0, 10);
  if (offset(iso) !== 0) return { "@day": offset(iso), "@time": moment.slice(11) };
  const gap = minutesOf(moment.slice(11)) - minutesOf(NOW_TIME);
  return gap <= 0 ? { "@ago": span(-gap) } : { "@in": span(gap) };
};
/** A passed moment: on its weekday when it is old enough, else counted back from the adding day. */
const passed = (moment: string): Row => (offset(moment.slice(0, 10)) <= -4 ? history(moment) : recent(moment));

// ── shipping days ───────────────────────────────────────────────────────────

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
/** The shop's shipping days, the setting's own default (Monday to Friday). */
export const SHIP_DAYS = String(APP_SETTINGS.find((s) => s.key === SHIP_DAYS_KEY)!.default).split(",");
const isShipDay = (iso: string): boolean => SHIP_DAYS.includes(WEEKDAYS[parse(iso).getUTCDay()]!) && !WORLD.CLOSURES.some((c) => c.iso === iso);
const nextShipDay = (iso: string): string => {
  let d = addDays(iso, 1);
  while (!isShipDay(d)) d = addDays(d, 1);
  return d;
};
/** The day a payment ships: that day when it is a shipping day and before the cut-off, else the next one (`addWorkingDays` with 0 days). */
export const shipsBy = (paid: string): string => (isShipDay(paid.slice(0, 10)) && paid.slice(11) < SHOP.cutoff ? paid.slice(0, 10) : nextShipDay(paid.slice(0, 10)));
/** So many shipping days after a day: when a parcel arrives. */
export const addShipDays = (iso: string, days: number): string => {
  let d = iso;
  for (let left = days; left > 0; left -= 1) d = nextShipDay(d);
  return d;
};

// ── money ───────────────────────────────────────────────────────────────────

export const cents = (money: string): number => Math.round(Number(money) * 100);
export const dollars = (c: number): string => (c / 100).toFixed(2);

// ── the shop ────────────────────────────────────────────────────────────────

/** Sales tax in percent, as the regions table keeps it (6.5 for 6.5 %), from the world's fractions. */
export const taxPercent = (state: string): number => Math.round((WORLD.TAX[state] ?? 0) * 100_000) / 1000;

/** The 50 states and DC, every one shipped to. */
export const STATES: [string, string][] = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"], ["CO", "Colorado"],
  ["CT", "Connecticut"], ["DE", "Delaware"], ["DC", "District of Columbia"], ["FL", "Florida"], ["GA", "Georgia"],
  ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"],
  ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"], ["MD", "Maryland"], ["MA", "Massachusetts"],
  ["MI", "Michigan"], ["MN", "Minnesota"], ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"],
  ["NE", "Nebraska"], ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"],
  ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"],
  ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"], ["SC", "South Carolina"], ["SD", "South Dakota"],
  ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"],
  ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
];
/** The states the world's second zone ("Alaska & Hawaii") covers. */
const REMOTE = ["AK", "HI"];
export const zoneOf = (state: string): string => (REMOTE.includes(state) ? "remote" : "contiguous");

/** One shipping price per service and zone the world prices: the band from nothing up, and the band that costs nothing, its "free from". */
export const OFFERS = WORLD.SERVICES.flatMap((s) =>
  Object.entries(s.bands).map(([zone, bands]) => {
    const base = bands.find((b) => cents(b.min) === 0)!;
    const free = bands.find((b) => cents(b.min) > 0 && cents(b.price) === 0);
    if (bands.length !== (free === undefined ? 1 : 2)) throw new Error(`${s.id} ${zone}: a band the shipping table cannot hold`);
    return { service: s.id, zone, price: base.price, freeFrom: free?.min ?? null };
  }),
);

const SETTINGS: Row = {
  shop_name: SHOP.name,
  email: SHOP.email,
  address_line1: SHOP.line1,
  city: SHOP.city,
  state_code: SHOP.state,
  zip: SHOP.zip,
  ref_prefix: SHOP.prefix,
  // The shop's own next order. The sample's 66 orders keep their numbers off the running series, so a first number
  // of 1001 would give the first real order NL-1001, the number a sample order already holds.
  first_number: Number(WORLD.NEXT_NUMBER.slice(SHOP.prefix.length)),
  // The same for returns: the sample's own returns keep their RT- numbers off the series, so the next is after the last.
  first_return_number: Math.max(...WORLD.RETURNS.map((r) => Number(r.number.replace(/^RT-/, "")))) + 1,
  pay_hold_minutes: SHOP.payHoldMinutes,
  transfer_name: SHOP.transfer.accountName,
  transfer_bank: SHOP.transfer.bank,
  transfer_routing: SHOP.transfer.routing,
  transfer_account: SHOP.transfer.account,
  transfer_days: SHOP.transferDays,
  return_days: SHOP.returnDays,
  promise_1: SHOP.promises[0] ?? null,
  promise_2: SHOP.promises[1] ?? null,
  promise_3: SHOP.promises[2] ?? null,
  about: SHOP.pages.about.join("\n\n"),
  privacy: SHOP.pages.privacy.join("\n\n"),
  terms: SHOP.pages.terms.join("\n\n"),
};

/**
 * When the catalogue was added, which a product cannot be without (the shop
 * sorts by it): the world keeps no such day. The shop opened its catalogue on
 * a Tuesday in May; the two new products came on Tuesday 4 August, six weeks
 * before they stop reading as new.
 */
const CATALOGUE_ADDED = "2026-05-05T09:00";
const NEW_ADDED = "2026-08-04T09:00";

// ── the orders' own moments ─────────────────────────────────────────────────

const STATUS: Record<WorldState, string> = {
  paying: "paying",
  paid: "paid",
  packed: "packed",
  shipped: "shipped",
  gift_sent: "sent",
  cancelled_unpaid: "cancelled",
  cancelled_customer: "cancelled",
  cancelled_staff: "cancelled",
};
const CANCEL_REASON: Partial<Record<WorldState, string>> = {
  cancelled_unpaid: "unpaid",
  cancelled_customer: "customer",
  cancelled_staff: "address",
};

/**
 * When the world's cancelled orders were cancelled, which it does not say: the
 * clock cancels an unpaid order at its pay-by; Noor cancelled hers on its own
 * link the next morning, before it was packed; the desk cancelled Ravi's on
 * the Monday it was to ship, the address being one DHL cannot reach.
 */
const CANCELLED_AT: Record<string, string> = { "NL-1022": "2026-07-31T08:12", "NL-1040": "2026-08-10T09:05" };
/** The two orders packed for today's pickup, packed this morning. */
const PACKED_TODAY = ["09:10", "09:25"];
/** A shipped order was packed half an hour before the carrier's pickup on the day it shipped, and went at the pickup. */
const PACKED_BEFORE_PICKUP = 30;

export interface Timeline {
  placed: string;
  payBy: string;
  paid: string | null;
  packed: string | null;
  shipped: string | null;
  cancelled: string | null;
}

export function timelineOf(o: WorldOrder): Timeline {
  const payBy = addMinutes(o.placed, SHOP.payHoldMinutes);
  const packedToday = WORLD.ORDERS.filter((x) => x.state === "packed").map((x) => x.number);
  const packed =
    o.state === "packed"
      ? `${TODAY}T${PACKED_TODAY[packedToday.indexOf(o.number)]!}`
      : o.state === "shipped"
        ? `${o.shippedOn!}T${hm(minutesOf(SHOP.carrier.pickup) - PACKED_BEFORE_PICKUP)}`
        : null;
  const shipped = o.state === "shipped" ? `${o.shippedOn!}T${SHOP.carrier.pickup}` : o.state === "gift_sent" ? o.paidAt : null;
  const cancelled = o.state === "cancelled_unpaid" ? payBy : (CANCELLED_AT[o.number] ?? null);
  if (o.state.startsWith("cancelled") && cancelled === null) throw new Error(`${o.number} is cancelled with no moment`);
  return { placed: o.placed, payBy, paid: o.paidAt, packed, shipped, cancelled };
}

/** An order is history when every moment it has had is more than three days back: all of them then keep their weekday. */
export const isHistory = (o: WorldOrder): boolean => {
  const t = timelineOf(o);
  return [t.placed, t.paid, t.packed, t.shipped, t.cancelled].every((m) => m === null || offset(m.slice(0, 10)) <= -4);
};
/** The form of every moment of one order, the ones still to come too (its stock held until, its link's last day). */
const momentOf = (o: WorldOrder): ((moment: string) => Row) => (isHistory(o) ? onWeekday : recent);
/** On its weekday, for a moment of a history order: passed (checked) or still to come. */
const onWeekday = (moment: string): Row => (offset(moment.slice(0, 10)) <= -4 ? history(moment) : { "@day": offset(moment.slice(0, 10)), "@time": moment.slice(11), "@week": true });

// ── the bundles ─────────────────────────────────────────────────────────────

const productById = new Map(WORLD.PRODUCTS.map((p) => [p.id, p]));
const variantBySku = new Map(WORLD.VARIANTS.map((v) => [v.sku, v]));
const customerById = new Map(WORLD.CUSTOMERS.map((c) => [c.id, c]));
const orderByNumber = new Map(WORLD.ORDERS.map((o) => [o.number, o]));

const ref = (label: string): Row => ({ "@ref": label });
const customerLabel = (c: Customer): string => `customer:${c.email.split("@")[0]!}`;
const optionLabel = (product: string, kind: "colour" | "size", id: string): string => `option:${product}:${kind}:${id}`;
const lineLabel = (order: string, sku: string): string => `line:${order}:${sku}`;
const giftLabel = (amount: string): string => `gift:${String(cents(amount) / 100)}`;
/** The digits of an order or return number: NL-1022 is 1022. */
const digits = (number: string): string => number.replace(/^\D+-/, "");

/** A return's reason, from the words the customer picked to the table's own. */
const RETURN_REASON: Record<string, string> = {
  "Doesn't fit": "fit",
  "Not what I expected": "expected",
  Faulty: "faulty",
  "Changed my mind": "mind",
};

/**
 * A return's own moments, which the world dates only by when it was asked:
 * the owner approves it the next shipping day at 09:30, the parcel comes back
 * four shipping days later at 11:00, and the refund goes the same afternoon.
 */
export function returnTimeline(r: Return): { asked: string; approved: string | null; received: string | null; refunded: string | null } {
  const step = ["asked", "approved", "received", "refunded"].indexOf(r.step);
  const approvedOn = nextShipDay(r.asked.slice(0, 10));
  const receivedOn = addShipDays(approvedOn, 4);
  return {
    asked: r.asked,
    approved: step >= 1 ? `${approvedOn}T09:30` : null,
    received: step >= 2 ? `${receivedOn}T11:00` : null,
    refunded: step >= 3 ? `${receivedOn}T15:00` : null,
  };
}

/** The message on the desk: Hana, given a gift card, asking how to spend it. */
const ENQUIRY = {
  name: "Hana Sato",
  email: "hana.s@example.com",
  topic: "other",
  message:
    "Leo gave me one of your gift cards for my birthday. Can I use it on the Ember 2 Tent and pay the rest by card, or does the card have to cover the whole order?",
  at: `${TODAY}T10:52`,
};

/** Two signed-in customers waiting for a size that is out: a Talus in 11, a Basalt shell in slate XL. */
const RESTOCK = [
  { sku: "NL-TAL-11", customer: 19, at: "2026-08-15T18:20" },
  { sku: "NL-BSH-SLA-XL", customer: 11, at: "2026-08-17T07:45" },
];

/** The shop's own sample. */
export function sampleBundle(): SampleBundle {
  const firstOrder = new Map<number, WorldOrder>();
  for (const o of [...WORLD.ORDERS].sort((a, b) => a.placed.localeCompare(b.placed))) if (!firstOrder.has(o.customer)) firstOrder.set(o.customer, o);

  const options: Row[] = [];
  for (const p of WORLD.PRODUCTS) {
    for (const option of p.options) {
      option.values.forEach((v, i) =>
        options.push({
          "@label": optionLabel(p.id, option.key, v.id),
          product_id: ref(`product:${p.id}`),
          kind: option.key,
          code: v.id,
          label: v.label,
          hex: option.key === "colour" ? (v.hex ?? null) : null,
          position: i + 1,
        }),
      );
    }
  }

  const orders: Row[] = [];
  const lines: Row[] = [];
  const giftLines: Row[] = [];
  const codes: Row[] = [];
  const payments: Row[] = [];
  const refunds: Row[] = [];
  for (const o of WORLD.ORDERS) {
    const t = timelineOf(o);
    const at = momentOf(o);
    const customer = customerById.get(o.customer)!;
    const goods = o.lines.length > 0;
    const status = STATUS[o.state];
    // Paid and not yet shipped: arriving as the stamps would date it, from the day it ships.
    const service = WORLD.SERVICES.find((s) => s.id === o.service);
    const arrives = o.arrives ?? (o.shipsBy !== null && service !== undefined && (status === "paid" || status === "packed") ? [addShipDays(o.shipsBy, service.days[0]), addShipDays(o.shipsBy, service.days[1])] : null);
    orders.push({
      "@label": `order:${o.number}`,
      // Off the running series: the shop's own first order is still the settings' first number.
      number_seq: null,
      number: o.number,
      status,
      cancel_reason: CANCEL_REASON[o.state] ?? null,
      kind: goods ? "goods" : "gift",
      pay_method: "online",
      customer_id: ref(customerLabel(customer)),
      customer_proved: customer.account,
      name: o.name,
      email: o.email,
      // Where it ships; a gift-cards-only order ships nothing and has no address.
      ship_name: goods ? o.name : null,
      address_line1: goods ? o.ship.line1 : null,
      city: goods ? o.ship.city : null,
      zip: goods ? o.ship.zip : null,
      region_id: goods ? ref(`region:${o.ship.state}`) : null,
      offer_id: goods ? ref(`offer:${o.service!}:${zoneOf(o.ship.state)}`) : null,
      language: "en-US",
      // The stamps a sample is never given, written as they would have been.
      placed_at: at(t.placed),
      pay_by: at(t.payBy),
      stock_until: at(addMinutes(t.placed, 45 * 1440)),
      link_expires: at(addMinutes(t.placed, 120 * 1440)),
      // What the paying order was told at checkout, "if you pay now".
      ...(status === "paying"
        ? { est_ships_by: week(shipsBy(t.placed)), est_from: week(addShipDays(shipsBy(t.placed), service!.days[0])), est_to: week(addShipDays(shipsBy(t.placed), service!.days[1])) }
        : {}),
      ships_by: o.shipsBy === null ? null : week(o.shipsBy),
      arrives_from: arrives === null ? null : week(arrives[0]),
      arrives_to: arrives === null ? null : week(arrives[1]),
      packed_at: t.packed === null ? null : at(t.packed),
      packed_by: t.packed === null ? null : WORLD.PACKER.name,
      shipped_at: t.shipped === null ? null : at(t.shipped),
      shipped_by: status === "shipped" ? WORLD.PACKER.name : null,
      carrier: status === "shipped" ? SHOP.carrier.name : null,
      tracking: o.tracking,
      cancelled_at: t.cancelled === null ? null : at(t.cancelled),
      // The customer's own cancel, the desk's, or the clock's (nobody).
      cancelled_by: o.state === "cancelled_customer" ? "customer" : o.state === "cancelled_staff" ? WORLD.SIGNED_IN_STAFF.name : null,
    });
    for (const line of o.lines) {
      if (!variantBySku.has(line.sku)) throw new Error(`${o.number}: no variant ${line.sku}`);
      lines.push({ "@label": lineLabel(o.number, line.sku), order_id: ref(`order:${o.number}`), variant_id: ref(`variant:${line.sku}`), qty: line.qty });
    }
    for (const gift of o.gifts) {
      giftLines.push({ order_id: ref(`order:${o.number}`), amount_id: ref(giftLabel(gift.amount)), to_name: gift.to, to_email: gift.toEmail, message: gift.message });
    }
    if (o.code !== null) codes.push({ order_id: ref(`order:${o.number}`), typed: o.code });
    if (t.paid !== null) {
      // Paid online through the pay page, as the customer's own write records it.
      payments.push({
        "@label": `payment:${o.number}`,
        order_id: ref(`order:${o.number}`),
        method: "online",
        amount: o.total,
        paid_at: at(t.paid),
        made_by: "customer",
        payment_ref: `pi_sample_${digits(o.number)}`,
        provider: "stripe",
      });
      // A paid order cancelled is given back in full, online, the moment it is cancelled.
      if (t.cancelled !== null) {
        refunds.push({
          payment_id: ref(`payment:${o.number}`),
          amount: o.total,
          reason: o.state === "cancelled_customer" ? "Cancelled by the customer" : "Cancelled: the address can't be delivered to",
          made_at: at(t.cancelled),
          automatic: true,
          refund_state: "done",
          provider_ref: `re_sample_${digits(o.number)}`,
        });
      }
    }
  }

  const returns: Row[] = [];
  const returnLines: Row[] = [];
  for (const r of WORLD.RETURNS) {
    const order = orderByNumber.get(r.order)!;
    const customer = customerById.get(order.customer)!;
    const t = returnTimeline(r);
    const reason = RETURN_REASON[r.reason];
    if (reason === undefined) throw new Error(`${r.number}: no reason for "${r.reason}"`);
    returns.push({
      "@label": `return:${r.number}`,
      number_seq: null,
      number: r.number,
      order_id: ref(`order:${r.order}`),
      // Asked by the signed-in customer; a guest asks through the order's own link, and the return names nobody.
      customer_id: customer.account ? ref(customerLabel(customer)) : null,
      status: r.step,
      reason,
      asked_at: history(t.asked),
      approved_at: t.approved === null ? null : history(t.approved),
      received_at: t.received === null ? null : history(t.received),
      received_by: t.received === null ? null : WORLD.PACKER.name,
      refunded_at: t.refunded === null ? null : history(t.refunded),
    });
    // A faulty piece goes back to the maker, never on the shelf.
    returnLines.push({ return_id: ref(`return:${r.number}`), line_id: ref(lineLabel(r.order, r.sku)), qty: r.qty, restock: reason !== "faulty" });
    if (t.refunded !== null) {
      refunds.push({
        payment_id: ref(`payment:${r.order}`),
        return_id: ref(`return:${r.number}`),
        amount: r.amount,
        reason: `Return ${r.number}`,
        made_at: history(t.refunded),
        made_by: WORLD.SIGNED_IN_STAFF.name,
        automatic: false,
        refund_state: "done",
        provider_ref: `re_sample_${digits(r.number)}`,
      });
    }
  }

  return {
    format: "adminium.sample/1",
    app: "ecommerce-shop",
    weekAnchor: "tue",
    tables: [
      { ref: "settings", onlyIfEmpty: true, rows: [SETTINGS] },
      { ref: "categories", rows: WORLD.CATEGORIES.map((c, i) => ({ "@label": `category:${c.id}`, name: c.name, slug: c.id, icon: c.icon, position: i + 1 })) },
      {
        ref: "size_guides",
        rows: Object.entries(WORLD.GUIDES).map(([key, g]) => ({ "@label": `guide:${key}`, name: g.title, columns_json: g.cols, rows_json: g.rows })),
      },
      {
        ref: "products",
        rows: WORLD.PRODUCTS.map((p, i) => ({
          "@label": `product:${p.id}`,
          name: p.name,
          slug: p.id,
          category_id: ref(`category:${p.cat}`),
          price: p.price,
          blurb: p.blurb,
          description: p.description,
          specs: p.specs.map(([label, value]) => ({ label, value })),
          size_guide_id: p.guide === null ? null : ref(`guide:${p.guide}`),
          size_name: p.options.find((o) => o.key === "size")?.name ?? "Size",
          featured: p.feat,
          new_until: p.newUntil === null ? null : { "@day": offset(p.newUntil) },
          status: "active",
          position: i + 1,
          created_at: history(p.new ? NEW_ADDED : CATALOGUE_ADDED),
        })),
      },
      { ref: "option_values", rows: options },
      {
        ref: "variants",
        rows: WORLD.VARIANTS.map((v) => {
          const delta = cents(v.price) - cents(productById.get(v.product)!.price);
          if (delta < 0) throw new Error(`${v.sku} costs less than its product: a price difference only adds`);
          return {
            "@label": `variant:${v.sku}`,
            product_id: ref(`product:${v.product}`),
            colour_id: v.colour === null ? null : ref(optionLabel(v.product, "colour", v.colour)),
            size_id: v.size === null ? null : ref(optionLabel(v.product, "size", v.size)),
            sku: v.sku,
            price_delta: delta > 0 ? dollars(delta) : null,
            weight_g: v.weightG,
            active: true,
            sold_out: false,
          };
        }),
      },
      { ref: "zones", rows: Object.entries(WORLD.ZONES).map(([code, label]) => ({ "@label": `zone:${code}`, code, label })) },
      {
        ref: "regions",
        rows: STATES.map(([code, name]) => ({ "@label": `region:${code}`, code, name, zone_id: ref(`zone:${zoneOf(code)}`), tax_rate: taxPercent(code), active: true })),
      },
      {
        ref: "shipping_services",
        rows: WORLD.SERVICES.map((s, i) => ({
          "@label": `service:${s.id}`,
          code: s.id,
          label: s.label,
          transit_min: s.days[0],
          transit_max: s.days[1],
          // No DHL product is named by the world; DHL's dispatch picks one when it books.
          dhl_product: null,
          active: true,
          position: i + 1,
        })),
      },
      {
        ref: "shipping_offers",
        rows: OFFERS.map((o) => ({ "@label": `offer:${o.service}:${o.zone}`, service_id: ref(`service:${o.service}`), zone_id: ref(`zone:${o.zone}`), price: o.price, free_from: o.freeFrom, active: true })),
      },
      { ref: "closures", rows: WORLD.CLOSURES.map((c) => ({ from_date: week(c.iso), to_date: week(c.iso), reason: c.name, active: true })) },
      { ref: "gift_amounts", rows: WORLD.GIFT_AMOUNTS.map((a, i) => ({ "@label": giftLabel(a), amount: a, active: true, position: i + 1 })) },
      {
        ref: "customers",
        rows: WORLD.CUSTOMERS.map((c) => {
          const first = firstOrder.get(c.id);
          if (first === undefined) throw new Error(`${c.name} has no order to date them by`);
          // The world keeps the day they said yes: ticked at the checkout of an order placed that day, else at noon.
          const tickedWith = WORLD.ORDERS.find((o) => o.customer === c.id && o.placed.slice(0, 10) === c.newsAgreed);
          return {
            "@label": customerLabel(c),
            email: c.email,
            name: c.name,
            language: "en-US",
            news: c.news,
            news_since: !c.news ? null : tickedWith !== undefined ? momentOf(tickedWith)(tickedWith.placed) : passed(`${c.newsAgreed!}T12:00`),
            created_at: momentOf(first)(first.placed),
          };
        }),
      },
      { ref: "orders", rows: orders },
      { ref: "order_lines", rows: lines },
      { ref: "gift_lines", rows: giftLines },
      { ref: "order_codes", rows: codes },
      { ref: "payments", rows: payments },
      { ref: "returns", rows: returns },
      { ref: "return_lines", rows: returnLines },
      { ref: "payment_refunds", rows: refunds },
      {
        ref: "enquiries",
        rows: [{ name: ENQUIRY.name, email: ENQUIRY.email, topic: ENQUIRY.topic, message: ENQUIRY.message, language: "en-US", status: "new", created_at: recent(ENQUIRY.at) }],
      },
      {
        ref: "restock_requests",
        rows: RESTOCK.map((r) => {
          const customer = customerById.get(r.customer)!;
          if (!customer.account || variantBySku.get(r.sku)!.onHand !== 0) throw new Error(`${r.sku}: a request is a signed-in customer's, for a variant that is out`);
          return { variant_id: ref(`variant:${r.sku}`), customer_id: ref(customerLabel(customer)), language: "en-US", asked_at: recent(r.at) };
        }),
      },
    ],
  };
}

// ── Inventory ───────────────────────────────────────────────────────────────

/**
 * The name Inventory's item takes, as the variant's `stock_name` join makes
 * it: product, colour, size and SKU with " · " between, an empty part left out
 * with its separator.
 */
export function stockName(v: Variant): string {
  const p = productById.get(v.product)!;
  const label = (kind: "colour" | "size", id: string | null) => (id === null ? null : p.options.find((o) => o.key === kind)!.values.find((x) => x.id === id)!.label);
  return [p.name, label("colour", v.colour), label("size", v.size), v.sku].filter((part) => part !== null && part !== "").join(" · ");
}

/** Where the stock is kept: the shop's back room on NW Kearney Street, the one place it sells from. */
const PLACE = { label: "place:stockroom", name: "Stockroom" };

/**
 * The shop's rows for Inventory. A sample variant posts nothing (sample data
 * is history), so it never adopts a stock item of its own: this file brings
 * one per variant, as a person could make it on Inventory's page, with the
 * link that says the variant uses it, one a piece. Its stock arrives on one
 * opening receipt that Inventory posts itself (`moves`), so on hand is the
 * world's at the clock: sample orders hold and take nothing, and what the world
 * shows held is not held here. A variant with none on hand has no line.
 */
export function inventorySection(): SampleBundle {
  const stocked = WORLD.VARIANTS.filter((v) => v.onHand > 0);
  return {
    format: "adminium.sample/1",
    app: "ecommerce-shop",
    addOn: "inventory",
    weekAnchor: "tue",
    tables: [
      { ref: "places", rows: [{ "@label": PLACE.label, name: PLACE.name, for_sale: true, active: true, position: 0, address: `${SHOP.line1}, ${SHOP.city}, ${SHOP.state} ${SHOP.zip}` }] },
      { ref: "items", rows: WORLD.VARIANTS.map((v) => ({ "@label": `item:${v.sku}`, name: stockName(v), sku: v.sku, active: true })) },
      {
        ref: "links",
        rows: WORLD.VARIANTS.map((v) => ({
          source_table: { "@table": "variants" },
          source_row: ref(`variant:${v.sku}`),
          kind: "item",
          item_id: ref(`item:${v.sku}`),
          qty: 1,
          per: "unit",
          action: "use",
        })),
      },
      { ref: "receipts", rows: [{ "@label": "receipt:opening", kind: "opening", place_id: ref(PLACE.label), note: "Opening stock" }] },
      { ref: "receipt_lines", rows: stocked.map((v) => ({ receipt_id: ref("receipt:opening"), item_id: ref(`item:${v.sku}`), qty_typed: v.onHand })) },
    ],
    moves: [
      { ref: "receipt:opening", to: "posting" },
      { table: "receipt_lines", to: "posted" },
      { ref: "receipt:opening", to: "posted" },
    ],
  };
}

/*
 * No `formsSection()`: the customers' reviews are Forms', and no sample can
 * bring them. Forms' `review_totals` adds the reviews up, and the docs refuse
 * in an app's file for an add-on any table a total adds up; no role of Forms
 * may create a review either, and no person may (guides/apps/reviews.md:
 * "cannot … create a review"). The world's 25 reviews stay in the world.
 */
