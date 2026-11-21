/**
 * The shop's state: what is on screen, the catalogue as far as it was read,
 * the basket, and Adminium's answers to them.
 *
 * Nothing here works out money or a date. A product's and a variant's price
 * are their rows'; a basket's figures are a dry run of the whole order through
 * the door open for it; a card's stock words are Inventory's. The catalogue is
 * never loaded whole: the listing asks Adminium for one page at a time,
 * filtered, searched and sorted on the server.
 *
 * The basket is kept in the browser (`localStorage`), with its retry key, so
 * a reload keeps it.
 */
import { newClientKey } from "@adminiumjs/public-client";
import { create } from "zustand";

import type { MessageKey } from "../i18n/index.tsx";
import { documentLanguage } from "./door.ts";
import { isShopError, type Id, type OrderBody, type OrderKind, type PayMethod, type PayOffer, type Product, type ProductDetail, type Quote, type Reviews, type Row, type ShippingOffer, type ShopBase, type ShopConfig, type ShopPort, type SortKey, type StockWord, type Variant } from "./port.ts";
import type { Place, ShopView } from "./route.ts";

export type { ShopView } from "./route.ts";

/** One variant in the basket: what the shopper chose, and the price it had when they added it ("Was"). */
export interface BasketLine {
  key: string;
  variantId: Id;
  productId: Id;
  slug: string;
  qty: number;
  /** The variant's own price when it went in the basket, shown as "Was" if Adminium's moves. */
  added: string;
  /** Shown until the dry run answers: the product's name and the variant's label as the shop typed them. */
  name: string;
  label: string | null;
  sku: string;
  categoryIcon: string | null;
}

/** A gift card in the basket: the shop's amount, who it is for and what it says. */
export interface BasketGift {
  key: string;
  amountId: Id;
  amount: string;
  toName: string;
  toEmail: string;
  message: string;
}

/** A card on a list: its product, and its stock words worked out from its variants' (best first). */
export interface CardStock {
  state: "in" | "low" | "out";
  left: number | null;
}

export type CodeNote = "unknown" | "needs-sign-in" | "nothing-to-take-off" | "not-first-order" | "ended" | "not-valid" | "too-many" | null;

export interface BasketQuote {
  /** What was asked: a later answer to an older question is dropped. */
  key: string;
  state: "busy" | "ok" | "failed" | "closed" | "signIn";
  quote: Quote | null;
}

export interface Toast {
  id: number;
  tone: "ok" | "info";
  key: MessageKey;
  params?: Record<string, string | number>;
}

/** The signed-in customer, as their own row says. Set by the sign-in; null for a guest. */
export interface Customer {
  name: string;
  email: string;
  news: boolean;
  /** Where their newest proved, not-cancelled order went: checkout fills it in (ACC-7). */
  address?: { shipName: string; line1: string; line2: string; city: string; zip: string; regionId: Id | null } | null;
}

export interface Listing {
  categorySlug: string | null;
  colour: string | null;
  size: string | null;
  priceMax: number | null;
  inStock: boolean;
  sort: SortKey;
  q: string;
}

export interface ShopState {
  port: ShopPort | null;
  config: ShopConfig;
  base: ShopBase | null;
  loading: "loading" | "ok" | "failed";
  view: ShopView;
  place: Place;
  /** Whether the shop takes payments online right now, as Adminium last said it. */
  offer: PayOffer;

  // ── home ──
  home: { state: "idle" | "busy" | "ok" | "failed"; fresh: Product[]; featured: Product[] };

  // ── the listing ──
  listing: Listing;
  list: { state: "idle" | "busy" | "more" | "ok" | "failed"; key: string; products: Product[]; next: string | null; count: { rows: number; atLeast: boolean } | null };
  /** Every card's stock words, by product id. */
  cardStock: Record<string, CardStock>;
  /** Each card's tint: its product's first colour, as the shop typed it. */
  cardTint: Record<string, string>;
  filterSheet: boolean;
  /** The cheapest and dearest prices on sale, for the "Price up to" slider: Adminium's, read once. */
  priceBounds: { min: number; max: number } | null;

  // ── a product's page ──
  product: { slug: string | null; state: "idle" | "busy" | "ok" | "missing" | "failed"; product: Product | null; detail: ProductDetail | null; reviews: Reviews | null; goes: Product[] };
  stock: Record<string, StockWord>;
  choice: { colourId: Id | null; sizeId: Id | null; qty: number; picture: number };
  restock: Record<string, "busy" | "sent" | "failed">;
  guideOpen: boolean;

  // ── the basket ──
  basket: BasketLine[];
  gifts: BasketGift[];
  codes: string[];
  codeNote: { code: string; note: CodeNote } | null;
  card: string | null;
  cardNote: "unknown" | "short" | null;
  basketQuote: BasketQuote | null;
  /** Inventory's words for each basket line's variant, by variant id. */
  basketStock: Record<string, StockWord>;
  drawer: boolean;
  /** "Everything from NL-1053 is back in your basket": set by "Order again". */
  basketNote: { number: string; left: { name: string; why: "sold" | "gone" }[] } | null;
  clientKey: string;

  // ── everywhere ──
  customer: Customer | null;
  /** The sign-in sheet over a screen (the checkout's "Sign in for a faster checkout"); it stays on that screen once signed in. */
  signInSheet: boolean;
  toasts: Toast[];
  announce: string;
}

/** One empty list for every selector that has nothing yet: a new `[]` each time would re-render forever. */
export const NONE: readonly never[] = Object.freeze([]);

/** The most of one variant a line may hold: one constant, capped lower by "Only N left". */
export const MAX_QTY = 10;

const BASKET_SLOT = "northline.basket";

function readBasket(): { lines: BasketLine[]; gifts: BasketGift[]; codes: string[]; card: string | null; clientKey: string | null } {
  const empty: { lines: BasketLine[]; gifts: BasketGift[]; codes: string[]; card: string | null; clientKey: string | null } = { lines: [], gifts: [], codes: [], card: null, clientKey: null };
  try {
    const raw = typeof localStorage === "undefined" ? null : localStorage.getItem(BASKET_SLOT);
    if (raw === null) return empty;
    const kept = JSON.parse(raw) as { lines?: unknown; gifts?: unknown; codes?: unknown; card?: unknown; clientKey?: unknown };
    return {
      lines: Array.isArray(kept.lines) ? (kept.lines as BasketLine[]) : [],
      gifts: Array.isArray(kept.gifts) ? (kept.gifts as BasketGift[]) : [],
      codes: Array.isArray(kept.codes) ? (kept.codes as unknown[]).filter((c): c is string => typeof c === "string") : [],
      card: typeof kept.card === "string" ? kept.card : null,
      clientKey: typeof kept.clientKey === "string" ? kept.clientKey : null,
    };
  } catch {
    return empty;
  }
}

const NO_LISTING: Listing = { categorySlug: null, colour: null, size: null, priceMax: null, inStock: false, sort: "featured", q: "" };

function initial(): Omit<ShopState, "port"> {
  const kept = readBasket();
  return {
    config: { timezone: "UTC", currency: "USD", now: null },
    base: null,
    loading: "loading",
    view: "home",
    place: { view: "home" },
    offer: { online: false, test: false },
    home: { state: "idle", fresh: [], featured: [] },
    listing: NO_LISTING,
    list: { state: "idle", key: "", products: [], next: null, count: null },
    cardStock: {},
    cardTint: {},
    filterSheet: false,
    priceBounds: null,
    product: { slug: null, state: "idle", product: null, detail: null, reviews: null, goes: [] },
    stock: {},
    choice: { colourId: null, sizeId: null, qty: 1, picture: 0 },
    restock: {},
    guideOpen: false,
    basket: kept.lines,
    gifts: kept.gifts,
    codes: kept.codes,
    codeNote: null,
    card: kept.card,
    cardNote: null,
    basketQuote: null,
    basketStock: {},
    drawer: false,
    basketNote: null,
    clientKey: kept.clientKey ?? newClientKey(),
    customer: null,
    signInSheet: false,
    toasts: [],
    announce: "",
  };
}

export const useShop = create<ShopState>(() => ({ port: null, ...initial() }));

const get = () => useShop.getState();
const set = (patch: Partial<ShopState>) => useShop.setState(patch);

export function keepBasket(): void {
  const s = get();
  try {
    localStorage.setItem(BASKET_SLOT, JSON.stringify({ lines: s.basket, gifts: s.gifts, codes: s.codes, card: s.card, clientKey: s.clientKey }));
  } catch {
    // storage refused: the basket lasts until the page goes
  }
}

/** For tests: back to a fresh page, with this port. */
export function resetShop(port: ShopPort | null): void {
  try {
    localStorage.removeItem(BASKET_SLOT);
  } catch {
    // nothing kept
  }
  useShop.setState({ port, ...initial(), basket: [], gifts: [], codes: [], card: null, clientKey: newClientKey() }, true);
}

// ── saying things ─────────────────────────────────────────────────────────

let toastId = 0;
export function toast(key: MessageKey, params?: Record<string, string | number>, tone: Toast["tone"] = "ok"): void {
  toastId += 1;
  const id = toastId;
  set({ toasts: [...get().toasts, { id, tone, key, ...(params === undefined ? {} : { params }) }] });
  setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), 4200);
}

/** A polite announcement (the page's one live region): words already in the reader's language. */
export function announce(words: string): void {
  set({ announce: "" });
  queueMicrotask(() => set({ announce: words }));
}

// ── the day, as Adminium's clock says it ───────────────────────────────────

/** Today on the shop's clock, from Adminium's own `now` (never the device's). */
export function today(): string | null {
  const { config } = get();
  if (config.now === null) return null;
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: config.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(config.now));
  } catch {
    return config.now.slice(0, 10);
  }
}

/** New this season: the shop set a day it stops being new, and that day has not passed. */
export function isNew(product: Product): boolean {
  const day = today();
  return product.newUntil !== null && day !== null && product.newUntil >= day;
}

// ── loading ───────────────────────────────────────────────────────────────

export async function loadShop(): Promise<void> {
  const port = get().port;
  if (port === null) return;
  set({ loading: "loading" });
  try {
    const [config, base, offer] = await Promise.all([port.config(), port.base(), port.payments().available()]);
    set({ config, base, offer, loading: "ok" });
    openPlace(get().place);
    void requoteBasket();
  } catch {
    set({ loading: "failed" });
  }
}

/** How this shop takes an order right now: online while payments are on, by bank transfer while its owner said yes and they are off. */
export function payMethod(): PayMethod | null {
  const s = get();
  if (s.offer.online) return "online";
  if (s.base?.settings.transferOn === true) return "transfer";
  return null;
}

// ── moving about ──────────────────────────────────────────────────────────

let onNavigate: ((place: Place) => void) | null = null;
/** The address bar's half: told of every move, so the address follows the screen. */
export function onShopNavigate(listener: ((place: Place) => void) | null): void {
  onNavigate = listener;
}

/** Screens drawn by other modules, told when they open (an order's page reads its link). */
const openers = new Map<ShopView, Set<(place: Place) => void>>();
/** Run code when a screen opens; several modules may listen to one screen. Returns its undoing. */
export function onOpen(view: ShopView, opener: (place: Place) => void): () => void {
  const set = openers.get(view) ?? new Set();
  set.add(opener);
  openers.set(view, set);
  return () => set.delete(opener);
}

/** Open the screen a place names, and say so to the address bar. */
export function go(place: Place, push = true): void {
  set({ view: place.view, place, drawer: false, filterSheet: false, guideOpen: false });
  if (push) onNavigate?.(place);
  openPlace(place);
}

export const goView = (view: ShopView): void => go({ view });

function openPlace(place: Place): void {
  if (get().loading !== "ok") return;
  switch (place.view) {
    case "home":
      void loadHome();
      break;
    case "shop":
      setListing({ ...NO_LISTING, sort: place.slug === "new" ? "newest" : "featured", categorySlug: place.slug && place.slug !== "new" ? place.slug : null }, false);
      break;
    case "search":
      setListing({ ...NO_LISTING, q: place.q ?? "" }, false);
      break;
    case "product":
      void openProduct(place.slug ?? "");
      break;
    case "basket":
    case "checkout":
      void requoteBasket();
      break;
    default:
      break;
  }
  for (const opener of openers.get(place.view) ?? []) opener(place);
}

// ── stock words ─────────────────────────────────────────────────────────

/**
 * A variant's words: Inventory's where it answered, else the shop's own "Sold
 * out" switch (a variant no stock item counts is shown as the shop sets it).
 */
export function wordOf(variant: Variant, words: Record<string, StockWord>): StockWord {
  const said = words[String(variant.id)];
  if (variant.soldOut) return { state: "out", left: null };
  return said ?? { state: "in", left: null };
}

/** A card's words from its variants': in stock if any is, else the most left of the low ones, else sold out. */
export function cardWord(variants: readonly Variant[], words: Record<string, StockWord>): CardStock {
  if (variants.length === 0) return { state: "in", left: null };
  const all = variants.map((v) => wordOf(v, words));
  if (all.some((w) => w.state === "in")) return { state: "in", left: null };
  const low = all.filter((w) => w.state === "low");
  if (low.length > 0) return { state: "low", left: low.reduce<number | null>((most, w) => (w.left === null ? most : Math.max(most ?? 0, w.left)), null) };
  return { state: "out", left: null };
}

/** Each card's tint: the first colour the product is made in. A product in no colour keeps the shop's own tint. */
async function loadCardTints(products: readonly Product[]): Promise<void> {
  const port = get().port;
  if (port === null || products.length === 0) return;
  try {
    const colours = await port.coloursOf(products.map((p) => p.id));
    const next = { ...get().cardTint };
    for (const p of products) {
      const first = colours.find((c) => String(c.productId) === String(p.id) && c.hex !== null);
      if (first?.hex) next[String(p.id)] = first.hex;
    }
    set({ cardTint: next });
  } catch {
    // no colours: the cards keep the shop's own tint
  }
}

/** The stock words of a page of cards: their variants, then Inventory's words for them. */
async function loadCardStock(products: readonly Product[]): Promise<void> {
  const port = get().port;
  if (port === null || products.length === 0) return;
  try {
    void loadCardTints(products);
    const variants = await port.variantsOf(products.map((p) => p.id));
    const words = await port.stock(variants.map((v) => v.id));
    const next = { ...get().cardStock };
    for (const p of products) next[String(p.id)] = cardWord(variants.filter((v) => String(v.productId) === String(p.id)), words);
    set({ cardStock: next });
  } catch {
    // no words: the cards show none rather than a guess
  }
}

// ── home ─────────────────────────────────────────────────────────────────

export async function loadHome(): Promise<void> {
  const port = get().port;
  if (port === null || get().home.state === "busy") return;
  set({ home: { ...get().home, state: "busy" } });
  try {
    const [newest, featured] = await Promise.all([port.products({ sort: "newest", limit: 12 }), port.products({ featured: true, sort: "featured", limit: 8 })]);
    const fresh = newest.products.filter(isNew);
    set({ home: { state: "ok", fresh, featured: featured.products } });
    void loadCardStock([...fresh, ...featured.products]);
  } catch {
    set({ home: { ...get().home, state: "failed" } });
  }
}

// ── the listing ──────────────────────────────────────────────────────────

const listingKey = (l: Listing) => JSON.stringify([l.categorySlug, l.colour, l.size, l.priceMax, l.sort, l.q.trim()]);

let searchTimer: ReturnType<typeof setTimeout> | null = null;

/** Change what the listing asks; a search waits 300 ms after the last key, and asks from 2 characters. */
export function setListing(next: Partial<Listing>, debounce = false): void {
  const listing = { ...get().listing, ...next };
  set({ listing });
  if (searchTimer !== null) clearTimeout(searchTimer);
  if (debounce) searchTimer = setTimeout(() => void loadList(), 300);
  else void loadList();
}

export function clearFilters(): void {
  const { listing } = get();
  setListing({ ...NO_LISTING, categorySlug: listing.categorySlug, q: listing.q, sort: listing.sort });
}

/** How many filters are on, for the phone's Filters button. */
export function filterCount(l: Listing): number {
  return [l.colour, l.size, l.priceMax].filter((v) => v !== null).length + (l.inStock ? 1 : 0);
}

export function categoryBySlug(slug: string | null): ShopBase["categories"][number] | null {
  return slug === null ? null : (get().base?.categories.find((c) => c.slug === slug) ?? null);
}

/** The slider's ends: the cheapest product and the dearest, as two one-row reads. */
async function loadBounds(): Promise<void> {
  const port = get().port;
  if (port === null || get().priceBounds !== null) return;
  try {
    const [low, high] = await Promise.all([port.products({ sort: "low", limit: 1 }), port.products({ sort: "high", limit: 1 })]);
    const min = Number(low.products[0]?.price ?? 0);
    const max = Number(high.products[0]?.price ?? 0);
    if (max > 0) set({ priceBounds: { min: Math.floor(min / 10) * 10, max: Math.ceil(max / 10) * 10 } });
  } catch {
    // no slider ends: the slider is not drawn
  }
}

/** The page size the listing asks for. */
export const LIST_PAGE = 12;

export async function loadList(more = false): Promise<void> {
  const s = get();
  if (s.port === null) return;
  const l = s.listing;
  const key = listingKey(l);
  void loadBounds();
  if (!more && s.list.key === key && s.list.state === "ok") return;
  const q = l.q.trim();
  const category = categoryBySlug(l.categorySlug);
  if (l.categorySlug !== null && category === null && s.base !== null) {
    set({ view: "missing" });
    return;
  }
  // A search of one character asks nothing: the page shows nothing found.
  if (s.view === "search" && q.length < 2) {
    set({ list: { state: "ok", key, products: [], next: null, count: { rows: 0, atLeast: false } } });
    return;
  }
  set({ list: { ...(more ? s.list : { products: [], next: null, count: null }), key, state: more ? "more" : "busy" } });
  try {
    const page = await s.port.products({
      categoryId: category?.id ?? null,
      colour: l.colour,
      size: l.size,
      priceMax: l.priceMax === null ? null : String(l.priceMax),
      q: q.length >= 2 ? q : null,
      sort: l.sort,
      limit: LIST_PAGE,
      cursor: more ? s.list.next : null,
    });
    if (get().list.key !== key) return;
    const products = more ? [...get().list.products, ...page.products] : page.products;
    set({ list: { state: "ok", key, products, next: page.next, count: more ? get().list.count : page.count } });
    await loadCardStock(page.products);
    // "In stock only" hides sold-out cards among those loaded; "Load more" keeps loading until the page fills.
    const after = get();
    if (after.listing.inStock && after.list.key === key && after.list.next !== null && shownCards().length < LIST_PAGE * (more ? 2 : 1)) await loadList(true);
  } catch {
    if (get().list.key === key) set({ list: { ...get().list, state: "failed" } });
  }
}

/** The cards on screen: those loaded, less the sold-out ones while "In stock only" is on. */
export function shownCards(): Product[] {
  const { list, listing, cardStock } = get();
  return listing.inStock ? list.products.filter((p) => cardStock[String(p.id)]?.state !== "out") : list.products;
}

// ── a product's page ─────────────────────────────────────────────────────

export async function openProduct(slug: string): Promise<void> {
  const port = get().port;
  if (port === null) return;
  if (get().product.slug === slug && get().product.state === "ok") return;
  set({ product: { slug, state: "busy", product: null, detail: null, reviews: null, goes: [] }, choice: { colourId: null, sizeId: null, qty: 1, picture: 0 }, restock: {} });
  try {
    const product = await port.productBySlug(slug);
    if (get().product.slug !== slug) return;
    if (product === null) {
      set({ product: { ...get().product, state: "missing" } });
      return;
    }
    const [detail, reviews, goes] = await Promise.all([
      port.detail(product.id),
      port.reviews(product.id).catch(() => null),
      product.categoryId === null ? Promise.resolve({ products: [] as Product[] }) : port.products({ categoryId: product.categoryId, sort: "featured", limit: 5 }).catch(() => ({ products: [] as Product[] })),
    ]);
    const words = await port.stock(detail.variants.map((v) => v.id)).catch(() => ({}));
    if (get().product.slug !== slug) return;
    const others = goes.products.filter((p) => String(p.id) !== String(product.id)).slice(0, 4);
    // The first colour the shop lists is chosen; a size waits for the shopper unless there is only one.
    const colours = detail.options.filter((o) => o.kind === "colour");
    const sizes = detail.options.filter((o) => o.kind === "size");
    set({
      product: { slug, state: "ok", product, detail, reviews, goes: others },
      stock: { ...get().stock, ...words },
      choice: { colourId: colours[0]?.id ?? null, sizeId: sizes.length === 1 ? sizes[0]!.id : null, qty: 1, picture: 0 },
    });
    void loadCardStock(others);
  } catch {
    if (get().product.slug === slug) set({ product: { ...get().product, state: "failed" } });
  }
}

/** The variant the choices name, when the shop makes it. */
export function chosenVariant(choice: ShopState["choice"] = get().choice): Variant | null {
  const { product } = get();
  const detail = product.detail;
  if (detail === null) return null;
  const hasColour = detail.options.some((o) => o.kind === "colour");
  const hasSize = detail.options.some((o) => o.kind === "size");
  if ((hasColour && choice.colourId === null) || (hasSize && choice.sizeId === null)) return null;
  return detail.variants.find((v) => (!hasColour || String(v.colourId) === String(choice.colourId)) && (!hasSize || String(v.sizeId) === String(choice.sizeId))) ?? null;
}

/** The variant a colour and a size would make, or null where the shop makes none in them. */
export function variantFor(colourId: Id | null, sizeId: Id | null): Variant | null {
  const detail = get().product.detail;
  if (detail === null) return null;
  return detail.variants.find((v) => (colourId === null || String(v.colourId) === String(colourId)) && (sizeId === null || String(v.sizeId) === String(sizeId))) ?? null;
}

/** The most one may add of a variant: the shop's cap, lower when Inventory shows how many are left. */
export function qtyCap(variant: Variant | null): number {
  if (variant === null) return MAX_QTY;
  const word = wordOf(variant, get().stock);
  if (word.state === "out") return 0;
  if (word.state === "low" && word.left !== null) return Math.max(0, Math.min(MAX_QTY, word.left));
  return MAX_QTY;
}

export function choose(patch: Partial<ShopState["choice"]>): void {
  const before = get().choice;
  const next = { ...before, ...patch };
  // A new colour shows its own pictures from the first.
  if (patch.colourId !== undefined && String(patch.colourId) !== String(before.colourId)) next.picture = 0;
  const cap = qtyCap(chosenVariant(next));
  next.qty = Math.max(1, Math.min(Math.max(cap, 1), next.qty));
  set({ choice: next });
}

/** "Tell me when it's back": a signed-in customer's request, one a variant. */
export async function askRestock(variant: Variant): Promise<void> {
  const port = get().port;
  if (port === null) return;
  const key = String(variant.id);
  set({ restock: { ...get().restock, [key]: "busy" } });
  try {
    await port.restock(variant.id);
    set({ restock: { ...get().restock, [key]: "sent" } });
  } catch (error) {
    // Asked already: it stands, and the page says so the same way.
    const again = isShopError(error) && error.refused.status === 409;
    set({ restock: { ...get().restock, [key]: again ? "sent" : "failed" } });
  }
}

// ── the basket ───────────────────────────────────────────────────────────

/** Add the chosen variant; a second add of one variant adds to its line, never past the cap. */
export function addToBasket(product: Product, variant: Variant, qty: number, categoryIcon: string | null): void {
  const lines = [...get().basket];
  const at = lines.findIndex((l) => String(l.variantId) === String(variant.id));
  const cap = qtyCap(variant);
  const label = [variant.colourLabel, variant.sizeLabel].filter((x): x is string => x !== null && x !== "").join(" · ") || null;
  if (at >= 0) lines[at] = { ...lines[at]!, qty: Math.min(cap, lines[at]!.qty + qty) };
  else lines.push({ key: newClientKey().slice(0, 12), variantId: variant.id, productId: product.id, slug: product.slug, qty: Math.min(cap, qty), added: variant.price, name: product.name, label, sku: variant.sku, categoryIcon });
  set({ basket: lines, drawer: true, basketNote: null });
  basketChanged();
  toast("shop.toast.added", { name: product.name });
}

export function setLineQty(key: string, qty: number): void {
  const lines = get().basket.map((l) => (l.key === key ? { ...l, qty: Math.max(1, Math.min(MAX_QTY, qty)) } : l));
  set({ basket: lines });
  basketChanged();
}

export function removeLine(key: string): void {
  set({ basket: get().basket.filter((l) => l.key !== key) });
  basketChanged();
}

export function addGift(gift: Omit<BasketGift, "key">): void {
  set({ gifts: [...get().gifts, { ...gift, key: newClientKey().slice(0, 12) }], drawer: true });
  basketChanged();
}

export function removeGift(key: string): void {
  set({ gifts: get().gifts.filter((g) => g.key !== key) });
  basketChanged();
}

/** A code typed in the basket's box: tried by a dry run; what Adminium says of it is shown beside the box. */
export function useCode(typed: string): void {
  const code = typed.trim().toUpperCase();
  if (code === "") return;
  set({ codes: [...get().codes.filter((c) => c !== code), code].slice(-4), codeNote: null });
  basketChanged();
}

export function dropCode(code: string): void {
  set({ codes: get().codes.filter((c) => c !== code), codeNote: null });
  basketChanged();
}

/** A gift card's code typed to pay with it: 12 characters, as the e-mail gives it. */
export function useCard(typed: string): boolean {
  const code = typed.replace(/[\s-]/g, "").toUpperCase();
  if (!/^[A-Z0-9]{12}$/.test(code)) {
    set({ cardNote: "short" });
    return false;
  }
  set({ card: code, cardNote: null });
  basketChanged();
  return true;
}

export function dropCard(): void {
  set({ card: null, cardNote: null });
  basketChanged();
}

/** Anything that changes the order makes a new retry key: a save is held to the basket the shopper saw. */
function basketChanged(): void {
  set({ clientKey: newClientKey() });
  keepBasket();
  void requoteBasket();
}

/** Empty the basket once its order is made, with a new retry key for the next. */
export function emptyBasket(): void {
  set({ basket: [], gifts: [], codes: [], card: null, codeNote: null, cardNote: null, basketQuote: null, clientKey: newClientKey() });
  keepBasket();
}

/** What kind of order the basket makes: goods when anything ships, gift cards alone otherwise. */
export function orderKind(): OrderKind {
  return get().basket.length > 0 ? "goods" : "gift";
}

/** The lines Inventory says can be sent now: a sold-out line stays in the basket, out of the order. */
export function orderableLines(): BasketLine[] {
  const words = get().basketStock;
  return get().basket.filter((l) => words[String(l.variantId)]?.state !== "out");
}

/** The shipping offer the basket is priced with before an address: the first service, to the shop's own state's zone. */
export function homeOffer(): { regionId: Id; offer: ShippingOffer } | null {
  const base = get().base;
  if (base === null) return null;
  const home = base.regions.find((r) => r.code === base.settings.stateCode) ?? base.regions[0];
  if (home === undefined) return null;
  const offers = base.offers.filter((o) => String(o.zoneId) === String(home.zoneId));
  const offer = base.services.map((s) => offers.find((o) => String(o.serviceId) === String(s.id))).find((o) => o !== undefined) ?? offers[0];
  return offer === undefined ? null : { regionId: home.id, offer };
}

/**
 * The order as it would be sent: the shopper's values, then each line that
 * can be sent, each gift card, the typed codes and a gift card paying.
 */
export function orderBody(values: Row, options: { codes?: readonly string[]; card?: string | null } = {}): OrderBody {
  const s = get();
  const lines = orderableLines();
  const codes = options.codes ?? s.codes;
  const card = options.card === undefined ? s.card : options.card;
  return {
    values: { language: documentLanguage(), ...values },
    children: {
      ...(lines.length === 0 ? {} : { order_lines: lines.map((l) => ({ values: { variant_id: l.variantId, qty: l.qty } })) }),
      ...(s.gifts.length === 0
        ? {}
        : {
            gift_lines: s.gifts.map((g) => ({ values: { amount_id: g.amountId, to_email: g.toEmail.trim(), ...(g.toName.trim() === "" ? {} : { to_name: g.toName.trim() }), ...(g.message.trim() === "" ? {} : { message: g.message.trim() }) } })),
          }),
      ...(codes.length === 0 ? {} : { order_codes: codes.map((typed) => ({ values: { typed } })) }),
      ...(card === null || card === undefined ? {} : { payments: [{ values: { card_code: card } }] }),
    },
  };
}

/** The code a refusal is about, by its place among the typed codes. */
export function codeNoteOf(reason: string | null): CodeNote {
  switch (reason) {
    case "unknown":
    case "needs-sign-in":
    case "nothing-to-take-off":
    case "not-first-order":
    case "ended":
      return reason;
    default:
      return "unknown";
  }
}

let basketAsk = 0;

/**
 * The basket's figures: a dry run of the whole order through the door open
 * now, priced to the shop's own state with its first shipping service until
 * the shopper gives an address. A code Adminium refuses is taken off and the
 * order asked again without it, its reason said beside the box; a gift card
 * it does not know, the same.
 */
export async function requoteBasket(): Promise<void> {
  const s = get();
  if (s.port === null || s.loading !== "ok") return;
  if (s.basket.length === 0 && s.gifts.length === 0) {
    set({ basketQuote: null });
    return;
  }
  basketAsk += 1;
  const ask = basketAsk;
  // Inventory's words for the basket's variants first: a sold-out line is marked, and left out of the order.
  if (s.basket.length > 0) {
    const words = await s.port.stock(s.basket.map((l) => l.variantId)).catch(() => ({}) as Record<string, StockWord>);
    if (ask !== basketAsk) return;
    set({ basketStock: words });
  }
  const pay = payMethod();
  const home = homeOffer();
  const kind = orderKind();
  if (pay === null) {
    set({ basketQuote: { key: String(ask), state: "closed", quote: null } });
    return;
  }
  if (orderableLines().length === 0 && get().gifts.length === 0) {
    set({ basketQuote: null });
    return;
  }
  const values: Row = kind === "goods" && home !== null ? { region_id: home.regionId, offer_id: home.offer.id } : {};
  set({ basketQuote: { key: String(ask), state: "busy", quote: get().basketQuote?.quote ?? null } });
  try {
    const quote = await s.port.quote(kind, pay, orderBody(values));
    if (ask !== basketAsk) return;
    set({ basketQuote: { key: String(ask), state: "ok", quote } });
  } catch (error) {
    if (ask !== basketAsk) return;
    if (isShopError(error)) {
      const r = error.refused;
      if (r.child === "order_codes" && r.index !== null) {
        const code = get().codes[r.index] ?? "";
        // The order changed (a code left it): a new retry key, as for any change of the basket.
        set({ codes: get().codes.filter((_, i) => i !== r.index), codeNote: { code, note: codeNoteOf(r.reason) }, clientKey: newClientKey() });
        keepBasket();
        return requoteBasket();
      }
      if (r.code === "PUBLIC_CARD_REFUSED" || r.child === "payments") {
        set({ card: null, cardNote: "unknown", clientKey: newClientKey() });
        keepBasket();
        return requoteBasket();
      }
      if (r.code === "PUBLIC_RATE_LIMITED" && get().codes.length > 0) {
        set({ codeNote: { code: get().codes.at(-1) ?? "", note: "too-many" } });
      }
      // A bank-transfer shop prices only for a signed-in customer.
      if (r.code === "PUBLIC_REF_NOT_FOUND" && pay === "transfer") {
        set({ basketQuote: { key: String(ask), state: "signIn", quote: null } });
        return;
      }
      if (r.code === "PUBLIC_SWITCHED_OFF") {
        set({ offer: await s.port.payments().available() });
        if (payMethod() !== pay) return requoteBasket();
        set({ basketQuote: { key: String(ask), state: "closed", quote: null } });
        return;
      }
    }
    set({ basketQuote: { key: String(ask), state: "failed", quote: null } });
  }
}

/** Whether a quote says some ledger cannot take the order right now (stock or gift cards unreachable). */
export function unavailable(quote: Quote | null): boolean {
  return quote?.postings.some((p) => p.state === "unavailable") ?? false;
}

/** Pieces in the basket, for the header's badge. */
export function basketPieces(s: Pick<ShopState, "basket" | "gifts">): number {
  return s.basket.reduce((n, l) => n + l.qty, 0) + s.gifts.length;
}

/** Open the sign-in as a sheet over this screen. */
export function openSignIn(open = true): void {
  set({ signInSheet: open });
}

export function openDrawer(open = true): void {
  set({ drawer: open });
  if (open) void requoteBasket();
}
