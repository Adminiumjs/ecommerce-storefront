/**
 * What the demo card's screens and shortcuts do: each one is what a person
 * would do on the page (choose a colour and a size, fill a form, ask for a
 * code, open a sheet), or what would happen in the world meanwhile (a price
 * goes up, the last piece sells, a parcel comes back, stock is counted in),
 * never a state the screens could not reach themselves. No shortcut says
 * "Done": the screen it leaves shows what it did (N4-F6).
 *
 * Every value a shortcut types is the sample's (`card.ts` reads them from
 * `northline-data.json`): Priya's details as her account has them, her
 * shipped order, Marcus's paid one, the code for packs.
 *
 * DEMO BUILD ONLY — nothing in a real build imports it.
 */
import { newClientKey } from "@adminiumjs/public-client";

import { reload } from "../desk/env.tsx";
import { packed } from "../desk/facts.ts";
import { go as deskGo, openSheet, useDesk, type View as DeskView } from "../desk/store.ts";
import { backToEmail, loadAccount, openCancel, openOrderLink, reread, resetAfter, sendCode, startReturn, typeFlow, useAfter } from "../shop/after.ts";
import { chosenQuote, heldCheckout, placeOrder, requoteOffers, resetCheckout, setAddress, setContact, useCheckout } from "../shop/checkout.ts";
import { forgetHeld, setLeave } from "../shop/pay.ts";
import { choose, go, goView, keepBasket, loadShop, orderableLines, requoteBasket, resetShop, useCode, useShop, type BasketLine, type ShopView } from "../shop/store.ts";
import WORLD from "../sample/northline-data.json";
import { demoAdminium, renewDemo, useDemo, type Persona } from "./adminium.ts";
import { MARCUS_PAID, PACK_CODE, PRIYA, PRIYA_SHIPPED, SHELL, SHELL_PICKS } from "./card.ts";
import { payInDemo, settle, type Outcome } from "./pay.ts";
import { n, same, set as filled } from "./rules.ts";

const demo = () => demoAdminium();
const world = () => demo().world;

/** The desk's screen state as a new page has it, kept for "Back to Tuesday morning". */
const DESK_START = { ...useDesk.getState() };

/** Wait, a little at a time and not for ever, until the page's answer is in. */
export async function until(done: () => boolean, tries = 80): Promise<void> {
  for (let i = 0; i < tries && !done(); i += 1) await new Promise((resolve) => setTimeout(resolve, 50));
}

// ── the screens ─────────────────────────────────────────────────────────────

/** The card's shopper screens, by the shop's own view (the paying states and the confirmation are the checkout's). */
const SHOP_SCREENS: Record<string, ShopView> = {
  home: "home",
  shop: "shop",
  product: "product",
  basket: "basket",
  checkout: "checkout",
  paying: "order",
  confirmation: "order",
  order: "order",
  find: "find",
  account: "account",
  sendback: "orderReturn",
  gift: "giftCards",
  help: "helpShipping",
  "404": "missing",
};

/** The card's desk screens, by the desk's own view. */
const DESK_SCREENS: Record<string, DeskView> = {
  today: "today",
  orders: "orders",
  packing: "packing",
  returns: "returns",
  products: "products",
  reviews: "reviews",
  customers: "customers",
  settings: "settings",
};

export const SCREEN_IDS = [...Object.keys(SHOP_SCREENS), ...Object.keys(DESK_SCREENS)];

/** Switch who is using it; the desk reads its rows again as it opens. */
export async function setPersona(persona: Persona): Promise<void> {
  if (useDemo.getState().persona === persona) return;
  useDemo.setState({ persona });
  if (persona === "desk") await reload(demo().desk);
}

// ── the basket, as a shopper fills it ──────────────────────────────────────

/** A basket line for a SKU, as the product page adds it: the variant's own price and the shop's words for it. */
function lineFor(sku: string, qty = 1): BasketLine | null {
  const w = world();
  const v = w.all("variants").find((x) => x["sku"] === sku);
  const p = v === undefined ? undefined : w.get("products", v["product_id"]);
  if (v === undefined || p === undefined) return null;
  return {
    key: newClientKey().slice(0, 12),
    variantId: v.id,
    productId: p.id,
    slug: String(p["slug"]),
    qty,
    added: String(v["price"]),
    name: String(p["name"]),
    label: [v["colour_label"], v["size_label"]].filter((x) => filled(x)).join(" · ") || null,
    sku,
    categoryIcon: (w.get("categories", p["category_id"])?.["icon"] as string | null | undefined) ?? null,
  };
}

/** The first variant of a product with plenty left, as a shopper would pick one. */
function plentyOf(slug: string): string | null {
  const w = world();
  const product = w.all("products").find((p) => p["slug"] === slug);
  const v = w.all("variants").find((x) => same(x["product_id"], product?.id) && x["active"] !== false && (w.available(x.id) ?? 0) >= 5);
  return v === undefined ? null : String(v["sku"]);
}

/** The basket set to these lines, its codes and gift card cleared, and its figures asked of Adminium. */
async function fillBasket(skus: readonly string[]): Promise<void> {
  const lines = skus.map((sku) => lineFor(sku)).filter((l): l is BasketLine => l !== null);
  useShop.setState({ basket: lines, gifts: [], codes: [], card: null, codeNote: null, cardNote: null, basketNote: null, clientKey: newClientKey() });
  keepBasket();
  await requoteBasket();
}

/** Priya's basket: what she has in the order she is paying for now (NL-1066). */
const PRIYA_BASKET = WORLD.ORDERS.find((o) => o.customer === PRIYA.id && o.state === "paying")!.lines.map((l) => l.sku);

async function ensureBasket(): Promise<void> {
  if (useShop.getState().basket.length === 0 && useShop.getState().gifts.length === 0) await fillBasket(PRIYA_BASKET);
}

// ── the checkout, as a shopper fills it ────────────────────────────────────

const regionId = (code: string): string => String(world().all("regions").find((r) => r["code"] === code)?.id ?? "");

/** Priya's details, as her account and her last order have them. */
async function fillPriya(state = PRIYA.state, city = PRIYA.city, zip = PRIYA.zip): Promise<void> {
  setContact({ email: PRIYA.email, name: PRIYA.name });
  const before = useCheckout.getState().address.regionId;
  setAddress({ shipName: PRIYA.name, line1: PRIYA.line1, line2: "", city, zip, regionId: regionId(state) });
  if (useCheckout.getState().step === "contact") useCheckout.setState({ step: "delivery" });
  if (before === regionId(state)) void requoteOffers();
  await until(() => chosenQuote() !== null);
}

/** The checkout open on a filled basket and Priya's details, its dry runs in. */
async function readyCheckout(): Promise<void> {
  await setPersona("shopper");
  await ensureBasket();
  if (useShop.getState().view !== "checkout" || useCheckout.getState().stage !== "form") goView("checkout");
  await until(() => useShop.getState().basketQuote?.state === "ok");
  const c = useCheckout.getState();
  if (c.email === "" || c.address.regionId === "") await fillPriya();
  else await until(() => chosenQuote() !== null);
}

/** The order placed, its pay step ending as asked; the page waits for the hand-off to be over. */
async function placeAndPay(outcome: Outcome, after = 0): Promise<void> {
  await readyCheckout();
  useCheckout.setState({ step: "pay" });
  setLeave((url) => payInDemo(url, after, outcome));
  try {
    await placeOrder();
  } finally {
    setLeave((url) => payInDemo(url));
  }
  await until(() => useCheckout.getState().stage !== "form" && useCheckout.getState().back !== "handoff");
}

/** The order the checkout holds at the pay page, while it is still being paid. */
const payingOrder = (): string | null => {
  const c = useCheckout.getState();
  return c.stage === "paying" && c.held !== null ? String(c.held.order["id"]) : null;
};

/** Back from paying, on the order's page: the checkout's paying states, or its confirmation. */
function showPayReturn(): void {
  useAfter.setState({ opened: null, link: null });
  if (useShop.getState().view !== "order") goView("order");
}

// ── an order's own page ─────────────────────────────────────────────────────

/** An order opened by its own link, as its e-mail opens it. */
async function openByLink(number: string): Promise<void> {
  const order = world().orderByNumber(number);
  if (order === undefined) return;
  await setPersona("shopper");
  const token = String(order["link_token"]);
  await demo().after.openShared(token);
  useAfter.setState({ chosen: null });
  // Not the checkout's paying states: this is another order's page.
  useCheckout.setState({ held: null, stage: "form", back: null });
  forgetHeld();
  goView("order");
  await openOrderLink(token);
}

// ── going to a screen ───────────────────────────────────────────────────────

export async function goScreen(screen: string): Promise<void> {
  const view = SHOP_SCREENS[screen];
  if (view !== undefined) {
    await setPersona("shopper");
    switch (screen) {
      case "shop":
        go({ view: "shop", slug: null });
        return;
      case "product":
        go({ view: "product", slug: useShop.getState().product.slug ?? SHELL });
        return;
      case "checkout":
        await ensureBasket();
        goView("checkout");
        return;
      case "paying":
        if (payingOrder() !== null) showPayReturn();
        else await placeAndPay("open", 0);
        return;
      case "confirmation":
        if (useCheckout.getState().stage === "done" && useCheckout.getState().held !== null) showPayReturn();
        else await placeAndPay("paid", 0);
        return;
      case "order":
        if (useAfter.getState().opened?.state === "ok" && !heldCheckout()) goView("order");
        else await openByLink(PRIYA_SHIPPED);
        return;
      case "account":
        if (!demo().after.signedIn()) demo().after.signInAs(PRIYA.email);
        goView("account");
        await loadAccount();
        return;
      case "sendback":
        await openByLink(PRIYA_SHIPPED);
        await until(() => useAfter.getState().opened?.state === "ok");
        startReturn();
        return;
      default:
        goView(view);
        return;
    }
  }
  const desk = DESK_SCREENS[screen];
  if (desk === undefined) return;
  await setPersona("desk");
  deskGo(desk);
}

/** Which of the card's screens the page is on. */
export function currentScreen(): string {
  if (useDemo.getState().persona === "desk") {
    const view = useDesk.getState().view;
    if (view === "order") return "orders";
    if (view === "product") return "products";
    if (view === "customer") return "customers";
    return DESK_SCREENS[view] === undefined ? "today" : view;
  }
  const view = useShop.getState().view;
  const c = useCheckout.getState();
  if (view === "order" && heldCheckout() && useAfter.getState().opened === null) return c.stage === "done" ? "confirmation" : "paying";
  if (view === "checkout") return c.stage === "done" ? "confirmation" : c.stage === "paying" ? "paying" : "checkout";
  if (view === "search") return "shop";
  if (view === "signIn") return "find";
  if (view === "giftBalance") return "gift";
  if (view === "helpSizes" || view === "helpContact" || view === "about" || view === "privacy" || view === "terms") return "help";
  if (view === "newsThanks") return "home";
  return Object.entries(SHOP_SCREENS).find(([id, v]) => v === view && id !== "paying" && id !== "confirmation")?.[0] ?? "home";
}

// ── the shortcuts ───────────────────────────────────────────────────────────

/** The shell open with a colour and a size chosen, as the shopper would choose them. */
async function chooseShell(colour: string, size: string): Promise<void> {
  await setPersona("shopper");
  go({ view: "product", slug: SHELL });
  await until(() => useShop.getState().product.slug === SHELL && useShop.getState().product.state === "ok");
  const options = useShop.getState().product.detail?.options ?? [];
  const id = (kind: "colour" | "size", code: string) => options.find((o) => o.kind === kind && o.code === code)?.id ?? null;
  choose({ colourId: id("colour", colour), sizeId: id("size", size) });
}

/** "Fill the code": the code the demo's Adminium last "e-mailed" to Priya, typed in; asked for first when it was not yet. */
async function fillCode(): Promise<void> {
  await setPersona("shopper");
  if (useShop.getState().view !== "find") goView("find");
  const flow = () => useAfter.getState().flows.find;
  if (flow().step !== "code") {
    if (flow().number.trim() === "" || flow().email.trim() === "") typeFlow("find", { number: PRIYA_SHIPPED, email: PRIYA.email });
    await sendCode("find");
  }
  const code = demo().after.codeFor(flow().email);
  if (code !== null) typeFlow("find", { digits: code });
}

/** The pay step of the order being paid settled one way; a new order taken there first when none is. */
async function payOutcome(outcome: Outcome): Promise<void> {
  if (payingOrder() === null) await goScreen("paying");
  const id = payingOrder();
  if (id === null) return;
  showPayReturn();
  await settle(id, outcome);
}

/** Inventory counts the shell's sold-out variant back in, and "Tell me when it's back" tells whoever asked. */
async function countBack(): Promise<void> {
  const w = world();
  const [colour, size] = SHELL_PICKS.out;
  const product = w.all("products").find((p) => p["slug"] === SHELL);
  const variant = w.all("variants").find((v) => same(v["product_id"], product?.id) && v["colour_code"] === colour && v["size_code"] === size);
  if (product === undefined || variant === undefined) return;
  if ((w.available(variant.id) ?? 0) <= 0) {
    w.stockMove(variant.id, 6, "counted");
    for (const ask of w.all("restock_requests").filter((r) => same(r["variant_id"], variant.id) && !filled(r["notified_at"]))) {
      ask["notified_at"] = w.nowIso();
      const who = w.get("customers", ask["customer_id"]);
      w.mail("back-in-stock", { to: who?.["email"], customerId: who?.id, requestId: ask.id, language: ask["language"] });
    }
    w.changed();
  }
  await setPersona("desk");
  await reload(demo().desk);
  deskGo("product", { productId: product.id });
}

/** A parcel back from a customer: its return, on the desk, with the sheet that receives it. */
async function returnBack(): Promise<void> {
  await setPersona("desk");
  const approved = world().all("returns").find((r) => r["status"] === "approved");
  deskGo("returns");
  if (approved !== undefined) openSheet({ kind: "receive", returnId: approved.id });
}

/** "Hand over to DHL": the packed orders, each through DHL's own dispatch flow in turn. */
async function handOver(): Promise<void> {
  await setPersona("desk");
  await reload(demo().desk);
  deskGo("packing");
  const data = useDesk.getState().data;
  const ready = data === null ? [] : packed(data);
  if (ready.length > 0) openSheet({ kind: "dispatch", orderIds: ready.map((o) => o.id), at: 0 });
}

const SHORTCUTS: Record<string, () => void | Promise<void>> = {
  "shell-low": () => chooseShell(...SHELL_PICKS.low),
  "shell-out": () => chooseShell(...SHELL_PICKS.out),
  "shell-none": () => chooseShell(...SHELL_PICKS.none),
  "fill-basket": async () => {
    await setPersona("shopper");
    await fillBasket(PRIYA_BASKET);
    goView("basket");
  },
  "one-fleece": async () => {
    await setPersona("shopper");
    const sku = plentyOf("fir-fleece");
    await fillBasket(sku === null ? [] : [sku]);
    goView("basket");
  },
  "try-code": async () => {
    await setPersona("shopper");
    const w = world();
    const packs = w.all("categories").find((c) => c["slug"] === WORLD.CODES[PACK_CODE as keyof typeof WORLD.CODES].on);
    const hasPack = useShop.getState().basket.some((l) => same(w.get("products", l.productId)?.["category_id"], packs?.id));
    if (!hasPack) {
      const sku = plentyOf("ridgeline-28");
      await fillBasket([...useShop.getState().basket.map((l) => l.sku), ...(sku === null ? [] : [sku])]);
    }
    goView("basket");
    useCode(PACK_CODE);
  },
  "fill-details": async () => {
    await readyCheckout();
    await fillPriya();
  },
  "ship-wa": async () => {
    await readyCheckout();
    await fillPriya("WA", "Seattle", "98101");
  },
  "price-up": async () => {
    await readyCheckout();
    const first = orderableLines()[0];
    const product = first === undefined ? undefined : world().get("products", first.productId);
    if (product === undefined) return;
    // Adminium's price moves; the page finds out when the shopper places the order.
    world().update("products", product.id, { price: (n(product["price"]) + 10).toFixed(2) });
    world().changed();
    useCheckout.setState({ step: "pay" });
    await placeOrder();
  },
  "sells-out": async () => {
    await readyCheckout();
    const first = orderableLines()[0];
    if (first === undefined) return;
    // Someone else buys the last of them: Inventory has none left when the order is saved.
    world().stockMove(first.variantId, -(world().available(first.variantId) ?? 0), "sold");
    world().changed();
    useCheckout.setState({ step: "pay" });
    await placeOrder();
  },
  paid: () => payOutcome("paid"),
  bank: () => payOutcome("confirming"),
  didnt: () => payOutcome("failed"),
  "priya-shipped": () => openByLink(PRIYA_SHIPPED),
  "marcus-cancel": async () => {
    await openByLink(MARCUS_PAID);
    await until(() => useAfter.getState().opened?.state === "ok");
    const status = String(useAfter.getState().opened?.read?.order["status"] ?? "");
    if (status === "paid" || status === "awaiting_transfer") openCancel(true);
  },
  "fill-find": async () => {
    await setPersona("shopper");
    if (useShop.getState().view !== "find") goView("find");
    if (useAfter.getState().flows.find.step === "code") backToEmail("find");
    typeFlow("find", { number: PRIYA_SHIPPED, email: PRIYA.email });
  },
  "fill-code": fillCode,
  "return-back": returnBack,
  dhl: handOver,
  "count-back": countBack,
};

export const SHORTCUT_IDS = Object.keys(SHORTCUTS);

export async function runShortcut(id: string): Promise<void> {
  await SHORTCUTS[id]?.();
}

// ── the clock ───────────────────────────────────────────────────────────────

/**
 * "+1 business day": the world's clock to the next day the shop ships, what
 * Adminium's clock runs meanwhile run (BN-14), and every figure counted from
 * today asked for again: the shop's today, the basket's and checkout's dry
 * runs (a code past its last day, the dates if paid now), the open order.
 */
export async function advanceDay(): Promise<void> {
  const w = world();
  w.advanceBusinessDay();
  useShop.setState({ config: { ...useShop.getState().config, now: w.nowIso() } });
  await requoteBasket();
  if (useShop.getState().view === "checkout" && useCheckout.getState().stage === "form") await requoteOffers();
  const opened = useAfter.getState().opened;
  if (opened?.read != null) await reread();
  if (useDemo.getState().persona === "desk") await reload(demo().desk);
}

/**
 * "Back to Tuesday morning": a fresh Northline in the same page — the sample
 * as it was added, the clock at 11:40, an empty basket, nobody signed in — on
 * the first screen of whoever is using it.
 */
export async function resetWorld(): Promise<void> {
  const fresh = renewDemo();
  resetShop(fresh.shop);
  resetAfter(null);
  resetCheckout();
  setLeave((url) => payInDemo(url));
  useDesk.setState({ ...DESK_START, theme: useDesk.getState().theme, toasts: [] }, true);
  await loadShop();
  goView("home");
  if (useDemo.getState().persona === "desk") await reload(fresh.desk);
}
