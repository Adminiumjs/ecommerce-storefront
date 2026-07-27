// Central store — a faithful port of the comp's `class Component` state + logic
// into a single Zustand store. View routing is state-based (no router): the
// top-level App switches on `view`.

import { create } from "zustand";
import { demoSource } from "../data/source.ts";
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

export interface ToastMsg {
  msg: string;
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
  toast_(msg: string): void;
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

function validateStep(step: number, f: Form): Record<string, string> {
  const e: Record<string, string> = {};
  if (step === 0) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((f.email || "").trim()))
      e.email = "Enter a valid email address";
  } else if (step === 1) {
    if (!(f.first || "").trim()) e.first = "Enter your first name";
    if (!(f.last || "").trim()) e.last = "Enter your last name";
    if (!(f.addr || "").trim()) e.addr = "Enter your street address";
    if (!(f.city || "").trim()) e.city = "Enter your city";
    if (!(f.zip || "").trim()) e.zip = "Required";
  } else if (step === 3) {
    if ((f.card || "").replace(/\D/g, "").length < 15) e.card = "1";
    if (!/^\s*\d{1,2}\s*\/\s*\d{2}\s*$/.test(f.exp || "")) e.exp = "1";
    if ((f.cvc || "").replace(/\D/g, "").length < 3) e.cvc = "1";
    if (!(f.name || "").trim()) e.name = "Enter the name on the card";
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

  toast_: (msg) => {
    set({ toast: { msg, t: Date.now() } });
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
      get().toast_("Your cart is empty");
      return;
    }
    set({ view: "checkout", coStep: 0, errs: {}, drawer: false, menu: false });
    toTop();
  },

  setNews: (v) => set({ news: v }),
  newsSubmit: () => {
    if (!/.+@.+\..+/.test(get().news)) {
      get().toast_("Enter a valid email");
      return;
    }
    get().toast_("You’re subscribed — check your inbox");
    set({ news: "" });
  },

  add: (pid, n = 1, opts = {}, custom = null, disc = 0) => {
    const p = get().index[pid];
    if (!p) return;
    const o = opts || {};
    if (optionsOf(p).length && !variantExists(p, o)) {
      get().toast_("That combination isn’t available");
      return;
    }
    if (variantStatus(p, o) === "out" || p.status === "out") {
      get().toast_("“" + p.title + "” is sold out");
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
    get().toast_(p.title + " added to cart");
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
      s.toast_("That combination isn’t available");
      return;
    }
    if (
      variantStatus(p, s.sel) === "out" ||
      variantStatus(p, s.sel) === "na" ||
      p.status === "out"
    ) {
      s.toast_("This option is sold out");
      return;
    }
    if (s.customOn && !s.customText.trim()) {
      s.toast_("Add your personalization text");
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
      s.toast_("That combination isn’t available");
      return;
    }
    if (
      variantStatus(p, s.sel) === "out" ||
      variantStatus(p, s.sel) === "na" ||
      p.status === "out"
    ) {
      s.toast_("This option is sold out");
      return;
    }
    if (s.customOn && !s.customText.trim()) {
      s.toast_("Add your personalization text");
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
  notify: () => get().toast_("We’ll email you when it’s back"),

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
      s.toast_("Pick a star rating");
      return;
    }
    if (!s.reviewBody.trim()) {
      s.toast_("Add a few words to your review");
      return;
    }
    const id = s.selected;
    set((st) => {
      const ur = { ...st.userReviews };
      const arr = (ur[id] || []).slice();
      arr.unshift({
        rating: st.reviewRating,
        title: st.reviewTitle.trim() || "My review",
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
    s.toast_("Thanks — your review is live!");
  },

  setPromoDraft: (v) => set({ promoDraft: v }),
  applyPromo: () => {
    const code = (get().promoDraft || "").trim().toUpperCase();
    if (code === "WELCOME10") {
      set({ promoOn: true });
      get().toast_("Promo WELCOME10 applied — 10% off");
    } else if (!code) {
      get().toast_("Enter a promo code");
    } else {
      get().toast_("That code isn’t valid");
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
  onLogin: () => get().toast_("Demo store — guest checkout only"),
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
      name: (f.first + " " + f.last).trim() || "Guest",
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
    get().toast_("Added to cart");
  },
  viewOrder: (number) => get().toast_("Order #" + number + " details"),
}));
