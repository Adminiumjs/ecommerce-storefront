/**
 * The checkout's state: the shopper's details, the delivery, placing the
 * order once at the total shown, and the paying states after.
 *
 * Every figure is Adminium's. Each delivery service offered to the chosen
 * state is priced by a dry run of the whole order with that service (its
 * shipping, tax, total and arrival window); the order is sent with the total
 * of the dry run the page showed, and a save that would come to another is
 * refused with nothing written. The page never adds a figure up.
 *
 * Placing empties the basket. An order paid online sends the tab to
 * Adminium's pay page; what the confirmation needs is kept in the tab
 * (`pay.ts`) so the order's page (`/o`, no code in its fragment) finds it on
 * the way back and shows the paying states, then the confirmation.
 */
import { newClientKey } from "@adminiumjs/public-client";
import { create } from "zustand";

import { documentLanguage } from "./door.ts";
import { last4 } from "./format.ts";
import { backOf, firstName, forgetHeld, keepHeld, keptHeld, leaveFor, marksOf, movedLines, readOrder, retryKey, type Back, type Held, type Mark } from "./pay.ts";
import { isShopError, type Id, type OrderKind, type PayMethod, type Placed, type Quote, type Row, type ShippingOffer, type StockWord } from "./port.ts";
import { codeNoteOf, dropCard, dropCode, emptyBasket, onOpen, orderableLines, orderBody, orderKind, payMethod, removeLine, setLineQty, unavailable, useShop } from "./store.ts";

export type StepId = "contact" | "delivery" | "pay";
export type FieldId = "email" | "name" | "shipName" | "line1" | "city" | "region" | "zip";

export interface Address {
  shipName: string;
  line1: string;
  line2: string;
  city: string;
  /** The region's id as the state list's value; "" until one is chosen. */
  regionId: string;
  zip: string;
}

export interface OfferQuote {
  state: "busy" | "ok" | "failed";
  quote: Quote | null;
}

/** A refusal of the save, shown in its dialog; nothing is ordered until the shopper presses again. */
export type Refusal =
  | { kind: "prices"; quote: Quote | null; total: string | null; moved: { key: string; name: string; label: string; was: string; now: string }[] }
  | { kind: "stock"; quote: Quote | null; marks: Mark[]; busy: boolean }
  | { kind: "code"; code: string; reason: string | null; quote: Quote | null }
  | { kind: "tooMany" }
  | { kind: "closed" };

export interface CheckoutState {
  step: StepId;
  email: string;
  /** The gift-cards-only order's name: there is no delivery step to type it in. */
  name: string;
  news: boolean;
  address: Address;
  /** The service the shopper picked, by its offer's id; the first offered when it is not offered to the state. */
  offerId: string | null;
  errors: Partial<Record<FieldId, true>>;
  /** Each offer's dry run, by offer id, for the state chosen. */
  quotes: Record<string, OfferQuote>;
  checking: boolean;
  /** The save did not get through (no answer, or one the page has no words for): said under the button. */
  failed: boolean;
  refusal: Refusal | null;
  retry: { sig: string; key: string } | null;
  /** The form; on the way to (or back from) paying; the confirmation. */
  stage: "form" | "paying" | "done";
  held: Held | null;
  back: Back | null;
}

const EMPTY_ADDRESS: Address = { shipName: "", line1: "", line2: "", city: "", regionId: "", zip: "" };

const initial = (): CheckoutState => ({
  step: "contact",
  email: "",
  name: "",
  news: false,
  address: EMPTY_ADDRESS,
  offerId: null,
  errors: {},
  quotes: {},
  checking: false,
  failed: false,
  refusal: null,
  retry: null,
  stage: "form",
  held: null,
  back: null,
});

export const useCheckout = create<CheckoutState>(() => initial());

const get = () => useCheckout.getState();
const set = (patch: Partial<CheckoutState>) => useCheckout.setState(patch);
const shop = () => useShop.getState();

/** For tests, and for a checkout opened again after an order: a fresh form. */
export function resetCheckout(): void {
  pollRun += 1;
  quoteAsk += 1;
  useCheckout.setState(initial(), true);
}

// Opening the checkout again after an order was placed starts a new one.
onOpen("checkout", () => {
  if (get().stage !== "form") resetCheckout();
});

/**
 * Whether this tab holds an order it just placed and sent to the pay page:
 * the order's page (`/o`, no code in its fragment) then shows the paying
 * states and the confirmation (`PayReturn` in `screens/Checkout.tsx`)
 * instead of asking for a link.
 */
export function heldCheckout(): boolean {
  const hash = typeof window === "undefined" ? "" : window.location.hash.replace(/^#/, "");
  if (hash !== "") return false;
  const { held } = get();
  return (held !== null && held.online) || keptHeld() !== null;
}

// ── the steps ───────────────────────────────────────────────────────────

/** The steps this order has: a gift-cards-only order ships nothing, so it has no delivery step. */
export function stepsOf(kind: OrderKind): StepId[] {
  return kind === "goods" ? ["contact", "delivery", "pay"] : ["contact", "pay"];
}

/** The fields each step asks, in the order they are drawn. */
function invalid(step: StepId): FieldId[] {
  const s = get();
  const signedIn = shop().customer !== null;
  const out: FieldId[] = [];
  if (step === "contact") {
    if (!signedIn && orderKind() === "gift" && s.name.trim() === "") out.push("name");
    if (!signedIn && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email.trim())) out.push("email");
  }
  if (step === "delivery") {
    const a = s.address;
    if (a.shipName.trim() === "") out.push("shipName");
    if (a.line1.trim() === "") out.push("line1");
    if (a.city.trim() === "") out.push("city");
    if (a.regionId === "") out.push("region");
    if (!/^\d{5}$/.test(a.zip.trim())) out.push("zip");
  }
  return out;
}

/** Continue: the step's fields checked; the first one wrong is returned (the page moves focus to it), else the next step opens. */
export function nextStep(): FieldId | null {
  const s = get();
  const wrong = invalid(s.step);
  if (wrong.length > 0) {
    set({ errors: Object.fromEntries(wrong.map((f) => [f, true])) });
    return wrong[0]!;
  }
  const steps = stepsOf(orderKind());
  const at = steps.indexOf(s.step);
  set({ step: steps[Math.min(steps.length - 1, at + 1)]!, errors: {} });
  return null;
}

/** Back to a step already done (the stepper, a review row's "Change"). */
export function goStep(step: StepId): void {
  const steps = stepsOf(orderKind());
  if (steps.indexOf(step) < steps.indexOf(get().step)) set({ step, errors: {} });
}

export function setContact(patch: Partial<Pick<CheckoutState, "email" | "name" | "news">>): void {
  const errors = { ...get().errors };
  if (patch.email !== undefined) delete errors.email;
  if (patch.name !== undefined) delete errors.name;
  set({ ...patch, errors });
}

const ADDRESS_FIELD: Partial<Record<keyof Address, FieldId>> = { shipName: "shipName", line1: "line1", city: "city", regionId: "region", zip: "zip" };

export function setAddress(patch: Partial<Address>): void {
  const errors = { ...get().errors };
  for (const k of Object.keys(patch) as (keyof Address)[]) {
    const f = ADDRESS_FIELD[k];
    if (f !== undefined) delete errors[f];
  }
  const regionChanged = patch.regionId !== undefined && patch.regionId !== get().address.regionId;
  set({ address: { ...get().address, ...patch }, errors, ...(regionChanged ? { quotes: {} } : {}) });
  if (regionChanged) void requoteOffers();
}

/** A signed-in customer's last proved order's address fills what the shopper has not typed (ACC-7). */
export function prefillAddress(): void {
  const from = shop().customer?.address;
  if (from === null || from === undefined) return;
  const a = get().address;
  const fill = (mine: string, theirs: string | null | undefined) => (mine.trim() === "" ? (theirs ?? "") : mine);
  const regionId = a.regionId === "" && from.regionId !== null ? String(from.regionId) : a.regionId;
  setAddress({ shipName: fill(a.shipName, from.shipName), line1: fill(a.line1, from.line1), line2: fill(a.line2, from.line2), city: fill(a.city, from.city), zip: fill(a.zip, from.zip), regionId });
}

export function pickOffer(offerId: Id): void {
  set({ offerId: String(offerId) });
}

// ── the services offered, and their dry runs ────────────────────────────────

/** The shipping offers for a state's zone, in the order the shop lists its services. */
export function offersFor(regionId: string): ShippingOffer[] {
  const base = shop().base;
  if (base === null || regionId === "") return [];
  const region = base.regions.find((r) => String(r.id) === regionId);
  if (region === undefined) return [];
  const zone = base.offers.filter((o) => String(o.zoneId) === String(region.zoneId));
  return base.services.flatMap((s) => zone.filter((o) => String(o.serviceId) === String(s.id)));
}

/** The offer the order goes with: the one picked, or the first offered to the state when that one is not. */
export function chosenOffer(s: Pick<CheckoutState, "address" | "offerId"> = get()): ShippingOffer | null {
  const offers = offersFor(s.address.regionId);
  return offers.find((o) => String(o.id) === s.offerId) ?? offers[0] ?? null;
}

/** The service's own name ("Standard"), as the shop typed it. */
export function serviceName(offer: ShippingOffer | null): string | null {
  if (offer === null) return null;
  return shop().base?.services.find((s) => String(s.id) === String(offer.serviceId))?.label ?? offer.serviceLabel.split(" · ")[0] ?? null;
}

/**
 * The dry run the page shows and the order is sent at: for goods, the chosen
 * service's to the chosen state; for gift cards alone, the basket's own.
 */
export function chosenQuote(s: CheckoutState = get()): Quote | null {
  if (orderKind() === "gift") return shop().basketQuote?.quote ?? null;
  const offer = chosenOffer(s);
  return offer === null ? null : (s.quotes[String(offer.id)]?.quote ?? null);
}

/** The values the order is sent with: the contact, and for goods the address and the service. */
export function orderValues(): Row {
  const s = get();
  const customer = shop().customer;
  const email = customer?.email ?? s.email.trim();
  // The news tick is never sent with the order: a yes is logged only for somebody signed in, after the order (`newsAfterPlacing`).
  if (orderKind() === "gift") return { name: customer?.name || s.name.trim(), email };
  const a = s.address;
  const offer = chosenOffer(s);
  return {
    name: customer?.name || a.shipName.trim(),
    email,
    ship_name: a.shipName.trim(),
    address_line1: a.line1.trim(),
    ...(a.line2.trim() === "" ? {} : { address_line2: a.line2.trim() }),
    city: a.city.trim(),
    zip: a.zip.trim(),
    region_id: a.regionId === "" ? null : idOf(a.regionId),
    offer_id: offer?.id ?? null,
  };
}

/** A region's id as Adminium gave it (a number stays a number). */
function idOf(value: string): Id {
  const region = shop().base?.regions.find((r) => String(r.id) === value);
  return region?.id ?? value;
}

let quoteAsk = 0;

/**
 * One dry run per service offered to the state, each the whole order with
 * that service: the price, tax, total and arrival window each shows are
 * Adminium's. A later ask drops an older one's answers.
 */
export async function requoteOffers(): Promise<void> {
  const port = shop().port;
  const pay = payMethod();
  const regionId = get().address.regionId;
  quoteAsk += 1;
  const ask = quoteAsk;
  if (port === null || pay === null || orderKind() !== "goods" || regionId === "" || shop().loading !== "ok") return;
  const offers = offersFor(regionId);
  if (offers.length === 0 || orderableLines().length === 0) {
    set({ quotes: {} });
    return;
  }
  const region = idOf(regionId);
  set({ quotes: Object.fromEntries(offers.map((o) => [String(o.id), { state: "busy", quote: get().quotes[String(o.id)]?.quote ?? null }])) });
  await Promise.all(
    offers.map(async (offer) => {
      let next: OfferQuote;
      try {
        next = { state: "ok", quote: await port.quote("goods", pay, orderBody({ region_id: region, offer_id: offer.id })) };
      } catch {
        // A refused code is taken off by the basket's own dry run, which asks this again once the basket changes.
        next = { state: "failed", quote: null };
      }
      if (ask !== quoteAsk) return;
      set({ quotes: { ...get().quotes, [String(offer.id)]: next } });
    }),
  );
}

/** The shop cannot take this order now: no way to pay, or a ledger Adminium cannot reach (C7, STK-10). */
export function closed(): boolean {
  const s = shop();
  if (payMethod() === null || s.basketQuote?.state === "closed") return true;
  return unavailable(chosenQuote()) || unavailable(s.basketQuote?.quote ?? null);
}

/** A bank-transfer order is a signed-in customer's (C6). */
export function needsSignIn(): boolean {
  return payMethod() === "transfer" && shop().customer === null;
}

// ── placing it ──────────────────────────────────────────────────────────────

/** How long to wait before asking again when Adminium says the order's slot is busy (STK-13): twice. */
export const BUSY_WAITS = [400, 900] as const;

const wait = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

/** The key this order is sent with: the same while nothing in it changed. */
function keyFor(values: Row): string {
  const retry = retryKey(get().retry, JSON.stringify([shop().clientKey, values]));
  set({ retry });
  return retry.key;
}

/** Pay / Place the order: sent at the total of the dry run on screen. */
export async function placeOrder(): Promise<void> {
  const quote = chosenQuote();
  if (quote === null || get().checking) return;
  await send(String(quote.order["total"] ?? ""));
}

async function send(expect: string): Promise<void> {
  const port = shop().port;
  const pay = payMethod();
  if (port === null || pay === null || get().checking) return;
  const kind = orderKind();
  const values = orderValues();
  const body = orderBody(values);
  const key = keyFor(values);
  set({ checking: true, failed: false, refusal: null });
  let placed: Placed;
  try {
    placed = await withBusyRetry(() => port.place(kind, pay, body, key, expect));
  } catch (error) {
    set({ checking: false });
    await refused(error, kind, pay, values);
    return;
  }
  await afterPlaced(placed, values, pay);
  await newsAfterPlacing(port);
  set({ checking: false });
}

/**
 * A signed-in customer's yes to news, given at checkout: logged for them after the order is placed, through the
 * newsletter's own door, which takes it only from somebody signed in. A guest is never shown the tick — an order
 * typed in somebody's address must never sign that somebody up.
 */
async function newsAfterPlacing(port: { newsSignup(email: string, language: string, clientKey: string): Promise<void> }): Promise<void> {
  const customer = shop().customer;
  if (customer === null || customer.news || !get().news) return;
  try {
    await port.newsSignup(customer.email, documentLanguage(), newClientKey());
  } catch {
    // the order stands; the account's own "News e-mails" switch is there to try again
  }
}

async function withBusyRetry<T>(run: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      const busy = isShopError(error) && error.refused.code === "PUBLIC_SLOT_BUSY";
      if (!busy || attempt >= BUSY_WAITS.length) throw error;
      await wait(BUSY_WAITS[attempt]!);
    }
  }
}

const ADDRESS_COLUMNS: Record<string, FieldId> = { ship_name: "shipName", address_line1: "line1", city: "city", region_id: "region", zip: "zip", email: "email", name: "name" };

async function refused(error: unknown, kind: OrderKind, pay: PayMethod, values: Row): Promise<void> {
  const port = shop().port;
  if (port === null || !isShopError(error)) {
    set({ failed: true });
    return;
  }
  const r = error.refused;
  switch (r.code) {
    case "PUBLIC_PRICE_CHANGED": {
      // The breakdown is a new dry run: the refusal carries the total, not every figure.
      const quote = await port.quote(kind, pay, orderBody(values)).catch(() => null);
      const moved = quote === null ? [] : movedLines(orderableLines(), quote);
      set({
        refusal: {
          kind: "prices",
          quote,
          total: quote === null ? (r.changed?.total ?? null) : String(quote.order["total"] ?? ""),
          moved: moved.map(({ line, now }) => ({ key: line.key, name: line.name, label: line.label ?? "", was: line.added, now })),
        },
      });
      return;
    }
    case "PUBLIC_OUT_OF_STOCK":
      set({ refusal: { kind: "stock", quote: null, marks: [], busy: true } });
      await recheckStock();
      return;
    case "PUBLIC_RATE_LIMITED":
      set({ refusal: { kind: "tooMany" } });
      return;
    case "PUBLIC_SWITCHED_OFF":
    case "PUBLIC_PAY_REFUSED":
      useShop.setState({ offer: await port.payments().available() });
      set({ refusal: { kind: "closed" } });
      return;
    case "PUBLIC_REF_NOT_FOUND":
      if (pay === "transfer") {
        set({ refusal: { kind: "closed" } });
        return;
      }
      break;
    case "PUBLIC_CARD_REFUSED":
      dropCard();
      useShop.setState({ cardNote: "unknown" });
      return;
    default:
      break;
  }
  if (r.child === "order_codes" && r.index !== null) {
    const codes = shop().codes;
    const code = codes[r.index] ?? "";
    const without = codes.filter((_, i) => i !== r.index);
    const quote = await port.quote(kind, pay, orderBody(values, { codes: without })).catch(() => null);
    set({ refusal: { kind: "code", code, reason: r.reason, quote } });
    return;
  }
  if (r.child === null && r.column !== null && ADDRESS_COLUMNS[r.column] !== undefined) {
    const field = ADDRESS_COLUMNS[r.column]!;
    set({ errors: { [field]: true }, step: field === "email" || field === "name" ? "contact" : "delivery" });
    return;
  }
  set({ failed: true });
}

/**
 * Out of stock at the save: Inventory's words again for every basket
 * variant, and a dry run of what can be sent; each line that cannot is
 * marked. "Order at" waits until none is (D3), and then shows Adminium's
 * total for what is left (F3).
 */
export async function recheckStock(): Promise<void> {
  const port = shop().port;
  const pay = payMethod();
  const before = get().refusal;
  if (port === null || pay === null || before?.kind !== "stock") return;
  set({ refusal: { ...before, busy: true } });
  const basket = shop().basket;
  const words = await port.stock(basket.map((l) => l.variantId)).catch(() => shop().basketStock as Record<string, StockWord>);
  useShop.setState({ basketStock: words });
  if (basket.length === 0 && shop().gifts.length === 0) {
    set({ refusal: null });
    return;
  }
  const sendable = orderableLines().length > 0 || shop().gifts.length > 0;
  const quote = sendable ? await port.quote(orderKind(), pay, orderBody(orderValues())).catch(() => null) : null;
  if (get().refusal?.kind !== "stock") return;
  set({ refusal: { kind: "stock", quote, marks: marksOf(shop().basket, words, quote), busy: false } });
}

/** "Change it": the line to what is left (or one fewer where the shop shows no number). */
export async function changeMarked(key: string): Promise<void> {
  const refusal = get().refusal;
  const line = shop().basket.find((l) => l.key === key);
  if (refusal?.kind !== "stock" || line === undefined) return;
  const mark = refusal.marks.find((m) => m.key === key);
  const qty = mark?.kind === "left" && mark.left !== null ? mark.left : line.qty - 1;
  if (qty < 1) removeLine(key);
  else setLineQty(key, qty);
  await recheckStock();
}

export async function removeMarked(key: string): Promise<void> {
  removeLine(key);
  await recheckStock();
}

/** Whether the refusal's "Order at" may be pressed. */
export function refusalBlocked(refusal: Refusal | null): boolean {
  if (refusal === null) return true;
  switch (refusal.kind) {
    case "prices":
      return refusal.total === null;
    case "stock":
      return refusal.busy || refusal.marks.length > 0 || refusal.quote === null || refusal.quote.postings.some((p) => p.state !== "ok");
    case "code":
      return refusal.quote === null;
    default:
      return true;
  }
}

/** The total "Order at" names: Adminium's, from the refusal's own dry run. */
export function refusalTotal(refusal: Refusal | null): string | null {
  if (refusal === null) return null;
  if (refusal.kind === "prices") return refusal.total;
  if (refusal.kind === "stock" || refusal.kind === "code") return refusal.quote === null ? null : String(refusal.quote.order["total"] ?? "");
  return null;
}

/** "Order at $…": the change the shopper agreed to, then the order sent again at the new total. */
export async function orderAtRefusal(): Promise<void> {
  const refusal = get().refusal;
  if (refusal === null || refusalBlocked(refusal)) return;
  const total = refusalTotal(refusal);
  if (total === null) return;
  if (refusal.kind === "prices" && refusal.quote !== null) {
    // The prices now are the ones the shopper agreed to: a later change is measured from them.
    const quote = refusal.quote;
    const lines = orderableLines();
    const now = new Map(lines.map((l, i) => [l.key, quote.lines[i]?.["each"]] as const));
    useShop.setState({ basket: shop().basket.map((l) => (now.get(l.key) === undefined || now.get(l.key) === null ? l : { ...l, added: String(now.get(l.key)) })) });
  }
  if (refusal.kind === "code") {
    dropCode(refusal.code);
    useShop.setState({ codeNote: { code: refusal.code, note: codeNoteOf(refusal.reason) } });
  }
  set({ refusal: null });
  await send(total);
}

export function closeRefusal(): void {
  set({ refusal: null });
}

// ── after placing ───────────────────────────────────────────────────────────

const PAID_STATUSES = new Set(["paid", "packed", "shipped", "sent"]);

async function afterPlaced(placed: Placed, values: Row, pay: PayMethod): Promise<void> {
  const port = shop().port;
  const card = shop().card;
  const offer = orderKind() === "goods" ? chosenOffer() : null;
  let held: Held = {
    order: placed.order,
    lines: placed.lines,
    gifts: placed.gifts,
    applied: placed.applied,
    payment: placed.payment,
    name: String(values["name"] ?? ""),
    service: serviceName(offer),
    online: pay === "online",
    token: placed.link?.token ?? null,
    card: card === null ? null : last4(card),
    icons: orderableLines().map((l) => l.categoryIcon),
  };
  emptyBasket();
  const status = String(placed.order["status"] ?? "");
  if (pay === "transfer" || PAID_STATUSES.has(status)) {
    // The bank details ride on the order's own row, which placing does not answer back.
    if (port !== null && held.order["id"] !== undefined && (pay === "transfer" ? held.order["transfer_note"] === undefined : held.order["ships_by"] === undefined)) {
      const row = await readOrder(port, held.order["id"] as Id);
      if (row !== null) held = { ...held, order: { ...held.order, ...row } };
    }
    set({ held, stage: "done", back: "paid" });
    return;
  }
  keepHeld(held);
  set({ held, stage: "paying", back: "handoff" });
  if (placed.payUrl !== null) {
    leaveFor(placed.payUrl);
    return;
  }
  // No pay link with the order (payments paused as it was placed): asked again, once.
  await payAgain();
}

// ── back from the pay page ──────────────────────────────────────────────────

/** How often the way back asks how the payment stands, and how long between; past that only an open checkout is asked again, slower. */
export const CHECKS = 8;
export const CHECK_MS = 1_500;
export const SLOW_CHECK_MS = 10_000;

let pollRun = 0;

/**
 * Back from the pay page: the order this tab placed, and how its payment
 * stands, asked of Adminium until there is something to say. Paid, the
 * confirmation; with the bank, "don't pay again"; did not finish, "Pay now"
 * again on the same order; cancelled unpaid, so; paid after it was
 * cancelled, a refund on its way.
 */
export async function resumePay(): Promise<void> {
  const held = get().held ?? keptHeld();
  if (held === null) return;
  if (!held.online || get().back === "paid") {
    set({ held, stage: "done", back: "paid" });
    return;
  }
  set({ held, stage: "paying", back: "checking" });
  pollRun += 1;
  const run = pollRun;
  const port = shop().port;
  const id = held.order["id"] as Id | undefined;
  if (port === null || id === undefined) return;
  for (let i = 0; ; i += 1) {
    if (i > 0) await wait(i < CHECKS ? CHECK_MS : SLOW_CHECK_MS);
    if (run !== pollRun) return;
    const [state, row] = await Promise.all([port.payments().state("link", id).catch(() => null), readOrder(port, id)]);
    if (run !== pollRun) return;
    if (row !== null) set({ held: { ...get().held!, order: { ...get().held!.order, ...row } } });
    const back = backOf(state, row, i >= CHECKS - 1 && state !== "open");
    if (back === null) continue;
    if (back === "paid" || back === "expired" || back === "paidCancelled") forgetHeld();
    set({ back, stage: back === "paid" ? "done" : "paying" });
    return;
  }
}

/** The page went: stop asking. */
export function stopPay(): void {
  pollRun += 1;
}

/** "Pay $217.00 now" again, on the same order: its pay link asked of Adminium again. */
export async function payAgain(): Promise<void> {
  const port = shop().port;
  const held = get().held;
  const id = held?.order["id"] as Id | undefined;
  if (port === null || held === null || id === undefined) return;
  set({ back: "handoff" });
  try {
    const url = await port.payments().start("link", id);
    keepHeld(get().held!);
    leaveFor(url);
  } catch {
    set({ back: "startRefused" });
  }
}

export { firstName };
