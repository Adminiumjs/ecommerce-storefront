// Central store — a faithful port of the comp's `class Component` state + logic
// into a single Zustand store. View routing is state-based (no router): the
// top-level App switches on `view`.

import { create } from "zustand";
import { PROMO_CODE, PROMO_RATE } from "../data/demo.ts";
import { demoSource } from "../data/source.ts";
import { number as fmtNumber, t as tr } from "../i18n/ambient";
import type {
  Cart,
  CartCustom,
  Order,
  OptionSelection,
  ShipMethod,
} from "../data/types.ts";
import type { Theme } from "../lib/placeholders.ts";
import { indexBy } from "../lib/catalog.ts";
import {
  cartArr,
  computeTotals,
  count as countLines,
  defaultSel,
  lineKey,
  normItems,
  optionsOf,
  variantExists,
  variantStatus,
  type CartLineView,
  type Totals,
} from "../lib/pricing.ts";

export type View =
  | "home"
  | "listing"
  | "product"
  | "cart"
  | "checkout"
  | "confirm"
  | "account";

export type Sort = "featured" | "price-asc" | "price-desc" | "name";
export type Avail = "all" | "in";

export interface Form {
  email: string;
  first: string;
  last: string;
  addr: string;
  apt: string;
  city: string;
  zip: string;
  country: string;
  card: string;
  exp: string;
  cvc: string;
  name: string;
}

/**
 * A toast is raised as a message KEY plus its params, never as finished prose.
 *
 * The store runs outside React and cannot hold a hook, so it names the string
 * instead of rendering it; `<Toast>` — which does have the hook — looks the key
 * up. A toast that is on screen when the reader switches language therefore
 * re-renders in the new one, and nothing here has to know what a locale is.
 *
 * `msg` is typed `string` rather than `MessageKey` on purpose: a screen may
 * still pass literal prose, and the runtime renders an unknown key verbatim,
 * so that keeps working while those screens are migrated.
 */
export interface ToastMsg {
  msg: string;
  params?: Record<string, string | number>;
  t: number;
}

const src = demoSource;
const products = src.getProducts();
const index = indexBy(products);

const SEED_ORDER: Order = {
  number: "1042",
  items: [
    ["kb-k2", 1],
    ["tote-l", 1],
    ["bottle-750", 2],
  ],
  ship: "standard",
  email: "ava@example.com",
  name: "Ava Reyes",
  addr: "118 Larkin St",
  city: "San Francisco, CA 94102",
};

const KNOWN_VIEWS: string[] = [
  "home",
  "listing",
  "product",
  "cart",
  "checkout",
  "confirm",
  "account",
];

// --- theme helpers -------------------------------------------------------

export function initialTheme(): Theme {
  if (typeof localStorage !== "undefined") {
    const t = localStorage.getItem("sf-theme");
    if (t === "light" || t === "dark") return t;
  }
  if (
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  )
    return "dark";
  return "light";
}

export function applyTheme(t: Theme) {
  if (typeof document !== "undefined")
    document.documentElement.setAttribute("data-theme", t);
  if (typeof localStorage !== "undefined") localStorage.setItem("sf-theme", t);
}

// --- timers (module-level singletons) ------------------------------------

let toastTimer: ReturnType<typeof setTimeout> | undefined;
let skelTimer: ReturnType<typeof setTimeout> | undefined;

function toTop() {
  try {
    window.scrollTo(0, 0);
  } catch {
    /* noop */
  }
}

const EMPTY_FORM: Form = {
  email: "",
  first: "",
  last: "",
  addr: "",
  apt: "",
  city: "",
  zip: "",
  country: "United States",
  card: "",
  exp: "",
  cvc: "",
  name: "",
};

export interface StoreState {
  // data
  products: typeof products;
  cats: ReturnType<typeof src.getCategories>;
  index: typeof index;
  ratings: ReturnType<typeof src.getRatings>;
  reviewPool: ReturnType<typeof src.getReviewPool>;
  seedOrders: Order[];
  customer: ReturnType<typeof src.getCustomer>;

  // ui / routing
  theme: Theme;
  view: View;
  cat: string;
  sort: Sort;
  avail: Avail;
  pmax: number;
  q: string;
  qDraft: string;
  drawer: boolean;
  menu: boolean;
  sortOpen: boolean;
  filtersOpen: boolean;
  sizeGuideOpen: boolean;
  loading: boolean;
  shown: number;
  toast: ToastMsg | null;
  news: string;

  // cart + promo
  cart: Cart;
  promoDraft: string;
  promoOn: boolean;

  // product detail
  selected: string;
  gIdx: number;
  qty: number;
  sel: OptionSelection;
  customOn: boolean;
  customText: string;
  customLogo: boolean;

  // reviews
  reviewOpen: boolean;
  reviewRating: number;
  reviewHover: number;
  reviewTitle: string;
  reviewBody: string;
  userReviews: Record<string, { rating: number; title: string; body: string }[]>;
  minRating: number;

  // checkout
  coStep: number;
  ship: ShipMethod;
  form: Form;
  errs: Record<string, string>;
  optIn: boolean;
  billingSame: boolean;
  lastOrder: Order | null;

  // derived
  getLines(): CartLineView[];
  getCount(): number;
  getTotals(): Totals;

  // actions
  toast_(msg: string, params?: Record<string, string | number>): void;
  skeleton(): void;
  is404(): boolean;

  toggleTheme(): void;
  go(view: View): void;
  goCat(slug: string): void;
  openProduct(id: string): void;
  submitSearch(): void;
  setQDraft(v: string): void;
  openMenu(): void;
  closeMenu(): void;
  openDrawer(): void;
  closeDrawer(): void;
  goCheckout(): void;

  setNews(v: string): void;
  newsSubmit(): void;

  add(
    pid: string,
    n?: number,
    opts?: OptionSelection,
    custom?: CartCustom | null,
    disc?: number,
  ): void;
  inc(key: string): void;
  dec(key: string): void;
  removeItem(key: string): void;

  // listing
  toggleSort(): void;
  closeSort(): void;
  setSort(s: Sort): void;
  toggleFilters(): void;
  filterCat(slug: string): void;
  setAvail(a: Avail): void;
  setMinRating(r: number): void;
  setPmax(n: number): void;
  clearFilters(): void;
  loadMore(): void;

  // product detail
  setSel(key: string, valueId: string): void;
  setGIdx(i: number): void;
  qtyInc(): void;
  qtyDec(): void;
  toggleCustom(): void;
  setCustomText(v: string): void;
  toggleLogo(): void;
  openSizeGuide(): void;
  closeSizeGuide(): void;
  addToCartPDP(): void;
  buyNow(): void;
  notify(): void;

  // reviews
  openReview(): void;
  closeReview(): void;
  setReviewRating(n: number): void;
  setReviewHover(n: number): void;
  setReviewTitle(v: string): void;
  setReviewBody(v: string): void;
  submitReview(): void;

  // cart + promo
  setPromoDraft(v: string): void;
  applyPromo(): void;
  removePromo(): void;

  // checkout
  setField(name: keyof Form, val: string): void;
  setShip(m: ShipMethod): void;
  toggleOptIn(): void;
  toggleBilling(): void;
  gotoStep(i: number): void;
  onLogin(): void;
  coNext(): void;
  coBack(): void;
  placeOrder(): void;

  // account
  buyAgain(o: Order): void;
  viewOrder(number: string): void;
}

/**
 * Field errors are resolved to finished text here rather than carried as keys,
 * because `errs` is read straight into the checkout form's markup. `tr` is
 * `i18n/ambient`'s forwarder — the provider's own `t`, republished on every
 * `<App>` render — so this is the app's one message table, not a second one.
 * The card / expiry / CVC entries stay the bare "1" sentinel they have always
 * been: they only drive the red field border and are never read as prose.
 */
function validateStep(step: number, f: Form): Record<string, string> {
  const e: Record<string, string> = {};
  if (step === 0) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((f.email || "").trim()))
      e.email = tr("chrome.err.email");
  } else if (step === 1) {
    if (!(f.first || "").trim()) e.first = tr("chrome.err.first");
    if (!(f.last || "").trim()) e.last = tr("chrome.err.last");
    if (!(f.addr || "").trim()) e.addr = tr("chrome.err.addr");
    if (!(f.city || "").trim()) e.city = tr("chrome.err.city");
    if (!(f.zip || "").trim()) e.zip = tr("chrome.err.zip");
  } else if (step === 3) {
    if ((f.card || "").replace(/\D/g, "").length < 15) e.card = "1";
    if (!/^\s*\d{1,2}\s*\/\s*\d{2}\s*$/.test(f.exp || "")) e.exp = "1";
    if ((f.cvc || "").replace(/\D/g, "").length < 3) e.cvc = "1";
    if (!(f.name || "").trim()) e.name = tr("chrome.err.cardName");
  }
  return e;
}

export const useStore = create<StoreState>((set, get) => ({
  products,
  cats: src.getCategories(),
  index,
  ratings: src.getRatings(),
  reviewPool: src.getReviewPool(),
  seedOrders: src.getOrders(),
  customer: src.getCustomer(),

  theme: initialTheme(),
  view: "home",
  cat: "all",
  sort: "featured",
  avail: "all",
  pmax: 200,
  q: "",
  qDraft: "",
  drawer: false,
  menu: false,
  sortOpen: false,
  filtersOpen: false,
  sizeGuideOpen: false,
  loading: false,
  shown: 8,
  toast: null,
  news: "",

  cart: {},
  promoDraft: "",
  promoOn: false,

  selected: "kb-k2",
  gIdx: 0,
  qty: 1,
  sel: {},
  customOn: false,
  customText: "",
  customLogo: false,

  reviewOpen: false,
  reviewRating: 0,
  reviewHover: 0,
  reviewTitle: "",
  reviewBody: "",
  userReviews: {},
  minRating: 0,

  coStep: 0,
  ship: "standard",
  form: EMPTY_FORM,
  errs: {},
  optIn: true,
  billingSame: true,
  lastOrder: SEED_ORDER,

  getLines: () => cartArr(get().cart, get().index),
  getCount: () => countLines(cartArr(get().cart, get().index)),
  getTotals: () =>
    computeTotals(
      cartArr(get().cart, get().index),
      get().ship,
      get().promoOn,
    ),

  toast_: (msg, params) => {
    set({ toast: { msg, params, t: Date.now() } });
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => set({ toast: null }), 2200);
  },
  skeleton: () => {
    if (skelTimer) clearTimeout(skelTimer);
    set({ loading: true });
    skelTimer = setTimeout(() => set({ loading: false }), 650);
  },
  is404: () => KNOWN_VIEWS.indexOf(get().view) < 0,

  toggleTheme: () => {
    const t: Theme = get().theme === "dark" ? "light" : "dark";
    applyTheme(t);
    set({ theme: t });
  },
  go: (view) => {
    set({ view, menu: false, drawer: false });
    toTop();
  },
  goCat: (slug) => {
    set({
      view: "listing",
      cat: slug,
      q: "",
      qDraft: "",
      sort: "featured",
      avail: "all",
      shown: 8,
      menu: false,
      drawer: false,
    });
    toTop();
    get().skeleton();
  },
  openProduct: (id) => {
    const p = get().index[id];
    set({
      view: "product",
      selected: id,
      gIdx: 0,
      qty: 1,
      sel: p ? defaultSel(p) : {},
      customOn: false,
      customText: "",
      customLogo: false,
      menu: false,
      drawer: false,
    });
    toTop();
  },
  submitSearch: () => {
    const q = get().qDraft.trim();
    set({
      view: "listing",
      cat: "all",
      q,
      shown: 8,
      menu: false,
      drawer: false,
    });
    toTop();
    get().skeleton();
  },
  setQDraft: (v) => set({ qDraft: v }),
  openMenu: () => set({ menu: true }),
  closeMenu: () => set({ menu: false }),
  openDrawer: () => set({ drawer: true }),
  closeDrawer: () => set({ drawer: false }),
  goCheckout: () => {
    if (get().getCount() === 0) {
      get().toast_("chrome.cart.emptyTitle");
      return;
    }
    set({ view: "checkout", coStep: 0, errs: {}, drawer: false, menu: false });
    toTop();
  },

  setNews: (v) => set({ news: v }),
  newsSubmit: () => {
    if (!/.+@.+\..+/.test(get().news)) {
      get().toast_("chrome.toast.emailInvalid");
      return;
    }
    get().toast_("chrome.toast.subscribed");
    set({ news: "" });
  },

  add: (pid, n = 1, opts = {}, custom = null, disc = 0) => {
    const p = get().index[pid];
    if (!p) return;
    const o = opts || {};
    if (optionsOf(p).length && !variantExists(p, o)) {
      get().toast_("chrome.toast.comboUnavailable");
      return;
    }
    if (variantStatus(p, o) === "out" || p.status === "out") {
      get().toast_("chrome.toast.soldOutNamed", { title: p.title });
      return;
    }
    const cu: CartCustom | null =
      custom && custom.text ? { text: custom.text, logo: !!custom.logo } : null;
    const d = disc || 0;
    const key = lineKey(p, o, cu, d);
    set((s) => {
      const c = { ...s.cart };
      const ex = c[key];
      c[key] = ex
        ? { ...ex, qty: ex.qty + n }
        : { pid, opts: o, custom: cu, qty: n, disc: d };
      return { cart: c };
    });
    get().toast_("chrome.toast.addedNamed", { title: p.title });
  },
  inc: (key) =>
    set((s) => {
      const c = { ...s.cart };
      if (c[key]) c[key] = { ...c[key], qty: c[key].qty + 1 };
      return { cart: c };
    }),
  dec: (key) =>
    set((s) => {
      const c = { ...s.cart };
      if (!c[key]) return {};
      const q = c[key].qty - 1;
      if (q <= 0) delete c[key];
      else c[key] = { ...c[key], qty: q };
      return { cart: c };
    }),
  removeItem: (key) =>
    set((s) => {
      const c = { ...s.cart };
      delete c[key];
      return { cart: c };
    }),

  toggleSort: () => set((s) => ({ sortOpen: !s.sortOpen })),
  closeSort: () => set({ sortOpen: false }),
  setSort: (sort) => set({ sort, sortOpen: false }),
  toggleFilters: () => set((s) => ({ filtersOpen: !s.filtersOpen })),
  filterCat: (slug) => {
    set({ cat: slug, q: "", qDraft: "", shown: 8, filtersOpen: false });
    get().skeleton();
  },
  setAvail: (a) => {
    set({ avail: a, shown: 8 });
    get().skeleton();
  },
  setMinRating: (r) => {
    set({ minRating: r, shown: 8 });
    get().skeleton();
  },
  setPmax: (n) => set({ pmax: n }),
  clearFilters: () => {
    set({
      cat: "all",
      q: "",
      qDraft: "",
      avail: "all",
      pmax: 200,
      minRating: 0,
      sort: "featured",
      shown: 8,
      filtersOpen: false,
    });
    get().skeleton();
  },
  loadMore: () => set((s) => ({ shown: s.shown + 8 })),

  setSel: (key, valueId) =>
    set((s) => ({ sel: { ...s.sel, [key]: valueId } })),
  setGIdx: (i) => set({ gIdx: i }),
  qtyInc: () => set((s) => ({ qty: s.qty + 1 })),
  qtyDec: () => set((s) => ({ qty: Math.max(1, s.qty - 1) })),
  toggleCustom: () => set((s) => ({ customOn: !s.customOn })),
  setCustomText: (v) => {
    const p = get().index[get().selected];
    const max = p && p.custom ? p.custom.max : 64;
    set({ customText: (v || "").slice(0, max) });
  },
  toggleLogo: () => set((s) => ({ customLogo: !s.customLogo })),
  openSizeGuide: () => set({ sizeGuideOpen: true }),
  closeSizeGuide: () => set({ sizeGuideOpen: false }),
  addToCartPDP: () => {
    const s = get();
    const p = s.index[s.selected];
    if (!p) return;
    if (!variantExists(p, s.sel)) {
      s.toast_("chrome.toast.comboUnavailable");
      return;
    }
    if (
      variantStatus(p, s.sel) === "out" ||
      variantStatus(p, s.sel) === "na" ||
      p.status === "out"
    ) {
      s.toast_("chrome.toast.optionSoldOut");
      return;
    }
    if (s.customOn && !s.customText.trim()) {
      s.toast_("chrome.toast.needPersonalization");
      return;
    }
    const custom: CartCustom | null =
      p.custom && s.customOn && s.customText.trim()
        ? { text: s.customText.trim(), logo: s.customLogo }
        : null;
    s.add(p.id, s.qty, s.sel, custom);
    set({ drawer: true, qty: 1 });
  },
  buyNow: () => {
    const s = get();
    const p = s.index[s.selected];
    if (!p) return;
    if (!variantExists(p, s.sel)) {
      s.toast_("chrome.toast.comboUnavailable");
      return;
    }
    if (
      variantStatus(p, s.sel) === "out" ||
      variantStatus(p, s.sel) === "na" ||
      p.status === "out"
    ) {
      s.toast_("chrome.toast.optionSoldOut");
      return;
    }
    if (s.customOn && !s.customText.trim()) {
      s.toast_("chrome.toast.needPersonalization");
      return;
    }
    const custom: CartCustom | null =
      p.custom && s.customOn && s.customText.trim()
        ? { text: s.customText.trim(), logo: s.customLogo }
        : null;
    s.add(p.id, s.qty, s.sel, custom);
    set({ qty: 1 });
    get().goCheckout();
  },
  notify: () => get().toast_("chrome.toast.backInStock"),

  openReview: () =>
    set({
      reviewOpen: true,
      reviewRating: 0,
      reviewHover: 0,
      reviewTitle: "",
      reviewBody: "",
    }),
  closeReview: () => set({ reviewOpen: false }),
  setReviewRating: (n) => set({ reviewRating: n }),
  setReviewHover: (n) => set({ reviewHover: n }),
  setReviewTitle: (v) => set({ reviewTitle: v }),
  setReviewBody: (v) => set({ reviewBody: v }),
  submitReview: () => {
    const s = get();
    if (s.reviewRating < 1) {
      s.toast_("chrome.toast.pickRating");
      return;
    }
    if (!s.reviewBody.trim()) {
      s.toast_("chrome.toast.reviewTooShort");
      return;
    }
    const id = s.selected;
    set((st) => {
      const ur = { ...st.userReviews };
      const arr = (ur[id] || []).slice();
      /* An untitled review is stored untitled. The placeholder headline is a
       * rendering decision, so it is made — and translated — where the review
       * is drawn, not frozen into the record in whatever language happened to
       * be selected at the moment it was posted. */
      arr.unshift({
        rating: st.reviewRating,
        title: st.reviewTitle.trim(),
        body: st.reviewBody.trim(),
      });
      ur[id] = arr;
      return {
        userReviews: ur,
        reviewOpen: false,
        reviewRating: 0,
        reviewHover: 0,
        reviewTitle: "",
        reviewBody: "",
      };
    });
    s.toast_("chrome.toast.reviewPosted");
  },

  setPromoDraft: (v) => set({ promoDraft: v }),
  applyPromo: () => {
    const code = (get().promoDraft || "").trim().toUpperCase();
    if (code === PROMO_CODE) {
      set({ promoOn: true });
      get().toast_("chrome.toast.promoApplied", {
        code,
        // The discount is a rate, not the string "10%": `Intl` writes it
        // "10 %" for fr-FR and "١٠٪" for ar-EG.
        pct: fmtNumber(PROMO_RATE, { style: "percent" }),
      });
    } else if (!code) {
      get().toast_("chrome.toast.promoEmpty");
    } else {
      get().toast_("chrome.toast.promoInvalid");
    }
  },
  removePromo: () => set({ promoOn: false, promoDraft: "" }),

  setField: (name, val) =>
    set((st) => ({
      form: { ...st.form, [name]: val },
      errs: { ...st.errs, [name]: "" },
    })),
  setShip: (m) => set({ ship: m }),
  toggleOptIn: () => set((s) => ({ optIn: !s.optIn })),
  toggleBilling: () => set((s) => ({ billingSame: !s.billingSame })),
  gotoStep: (i) => {
    if (i <= get().coStep) set({ coStep: i, errs: {} });
  },
  onLogin: () => get().toast_("chrome.toast.guestOnly"),
  coNext: () => {
    const e = validateStep(get().coStep, get().form);
    if (Object.keys(e).length) {
      set({ errs: e });
      return;
    }
    set({ coStep: Math.min(3, get().coStep + 1), errs: {} });
    toTop();
  },
  coBack: () => {
    if (get().coStep === 0) {
      get().go("cart");
      return;
    }
    set({ coStep: get().coStep - 1, errs: {} });
    toTop();
  },
  placeOrder: () => {
    const e = validateStep(3, get().form);
    if (Object.keys(e).length) {
      set({ errs: e });
      return;
    }
    const f = get().form;
    const lines = get().getLines();
    const items = lines.map((x) => ({
      pid: x.p.id,
      qty: x.qty,
      unit: x.unit,
      optLabel: x.optLabel,
      customLabel: x.customLabel,
    }));
    const t = get().getTotals();
    const order: Order = {
      number: "1042",
      items,
      shipMethod: get().ship,
      promoOn: get().promoOn,
      email: f.email || "you@email.com",
      /* No copy in the store: an empty name lets <Confirm> fall back through
       * the bundle. This used to hard-code the English word "Guest". */
      name: (f.first + " " + f.last).trim(),
      addr: (f.addr || "") + (f.apt ? ", " + f.apt : ""),
      city: [f.city, f.zip].filter(Boolean).join(", "),
      country: f.country,
      totals: {
        sub: t.sub,
        disc: t.disc,
        ship: t.ship,
        shipFree: t.shipFree,
        tax: t.tax,
        total: t.total,
      },
    };
    set({ lastOrder: order, view: "confirm", cart: {}, coStep: 0, errs: {} });
    toTop();
  },

  buyAgain: (o) => {
    const ni = normItems(o.items, get().index);
    set((st) => {
      const c = { ...st.cart };
      ni.forEach((it) => {
        const p = get().index[it.pid];
        if (p && p.status !== "out") {
          const key = lineKey(p, {}, null, 0);
          const ex = c[key];
          c[key] = ex
            ? { ...ex, qty: ex.qty + it.qty }
            : { pid: it.pid, opts: {}, custom: null, qty: it.qty, disc: 0 };
        }
      });
      return { cart: c, drawer: true };
    });
    get().toast_("chrome.toast.addedToCart");
  },
  viewOrder: (number) => get().toast_("chrome.toast.orderDetails", { number }),
}));
