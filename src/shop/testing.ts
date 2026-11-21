/**
 * A stand-in for Adminium behind the shop's door, for the screens' tests:
 * Northline's sample world (`src/sample/northline-data.json`, the same file
 * `figures.md` is written from), answered the way the shop's public doors
 * answer it, and a dry run that works an order's figures out the way the
 * manifest's rules do (a code's share, shipping free from a figure, the
 * state's tax on the goods after discount, a gift card paying the goods). It
 * is not Adminium: the shop's contract (`src/contract/shop.contract.test.ts`)
 * places an order on a real one.
 *
 * Tests only; nothing that ships imports it.
 */
import data from "../sample/northline-data.json";
import { fakeAfter, type FakeAfter } from "./after-testing.ts";
import {
  ShopError,
  type Id,
  type OptionValue,
  type OrderBody,
  type OrderKind,
  type PayMethod,
  type PayOffer,
  type PayState,
  type Placed,
  type Product,
  type ProductDetail,
  type ProductPage,
  type ProductQuery,
  type Quote,
  type Refused,
  type Reviews,
  type Row,
  type ShopBase,
  type ShopConfig,
  type ShopFeatures,
  type ShopPayments,
  type ShopPort,
  type StockWord,
  type Variant,
} from "./port.ts";

type World = typeof data;
type WorldProduct = World["PRODUCTS"][number];

const cents = (v: unknown) => Math.round(Number(v ?? 0) * 100);
const fixed = (c: number) => (c / 100).toFixed(2);
/** Half away from zero, as Adminium rounds money. */
const share = (c: number, percent: number) => Math.round((c * percent) / 100);

const STATES =
  "AL:Alabama|AK:Alaska|AZ:Arizona|AR:Arkansas|CA:California|CO:Colorado|CT:Connecticut|DE:Delaware|DC:District of Columbia|FL:Florida|GA:Georgia|HI:Hawaii|ID:Idaho|IL:Illinois|IN:Indiana|IA:Iowa|KS:Kansas|KY:Kentucky|LA:Louisiana|ME:Maine|MD:Maryland|MA:Massachusetts|MI:Michigan|MN:Minnesota|MS:Mississippi|MO:Missouri|MT:Montana|NE:Nebraska|NV:Nevada|NH:New Hampshire|NJ:New Jersey|NM:New Mexico|NY:New York|NC:North Carolina|ND:North Dakota|OH:Ohio|OK:Oklahoma|OR:Oregon|PA:Pennsylvania|RI:Rhode Island|SC:South Carolina|SD:South Dakota|TN:Tennessee|TX:Texas|UT:Utah|VT:Vermont|VA:Virginia|WA:Washington|WV:West Virginia|WI:Wisconsin|WY:Wyoming"
    .split("|")
    .map((s) => s.split(":") as [string, string]);

/** The sample's rows as the shop's doors answer them, with stable numeric ids. */
export function sampleWorld() {
  const categories = data.CATEGORIES.map((c, i) => ({ id: i + 1, name: c.name, slug: c.id, icon: c.icon, position: i + 1, count: data.PRODUCTS.filter((p) => p.cat === c.id).length }));
  const catId = (slug: string) => categories.find((c) => c.slug === slug)!.id;
  const guides = Object.entries(data.GUIDES).map(([key, g], i) => ({ key, id: i + 1, name: g.title, columns: g.cols, rows: g.rows, note: null as string | null }));
  const products: (Product & { world: WorldProduct })[] = data.PRODUCTS.map((p, i) => ({
    id: i + 1,
    name: p.name,
    slug: p.id,
    categoryId: catId(p.cat),
    categoryName: categories.find((c) => c.slug === p.cat)!.name,
    price: p.price,
    blurb: p.blurb,
    description: (p as { description?: string }).description ?? null,
    specs: p.specs as [string, string][],
    sizeGuideId: p.guide === null ? null : (guides.find((g) => g.key === p.guide)?.id ?? null),
    sizeName: p.options.find((o) => o.key === "size")?.name ?? null,
    featured: p.feat,
    newUntil: (p as { newUntil?: string }).newUntil ?? null,
    createdAt: `2026-0${p.new ? 8 : 6}-${String(10 + (i % 18)).padStart(2, "0")}T10:00:00Z`,
    variantsCount: data.VARIANTS.filter((v) => v.product === p.id).length,
    world: p,
  }));
  const options: OptionValue[] = [];
  for (const p of products) {
    for (const group of p.world.options) {
      group.values.forEach((v, j) => {
        options.push({ id: options.length + 1, productId: p.id, kind: group.key === "colour" ? "colour" : "size", code: v.id, label: v.label, hex: (v as { hex?: string }).hex ?? null, position: j + 1 });
      });
    }
  }
  const optionOf = (productId: Id, kind: "colour" | "size", code: string | null) => (code === null ? null : (options.find((o) => o.productId === productId && o.kind === kind && o.code === code) ?? null));
  const variants: (Variant & { available: number })[] = data.VARIANTS.map((v, i) => {
    const p = products.find((x) => x.slug === v.product)!;
    const colour = optionOf(p.id, "colour", v.colour);
    const size = optionOf(p.id, "size", v.size);
    return {
      id: i + 1,
      productId: p.id,
      colourId: colour?.id ?? null,
      sizeId: size?.id ?? null,
      colourCode: v.colour,
      sizeCode: v.size,
      colourLabel: colour?.label ?? null,
      sizeLabel: size?.label ?? null,
      sku: v.sku,
      priceDelta: fixed(cents(v.price) - cents(p.price)),
      price: v.price,
      soldOut: false,
      available: v.available,
    };
  });
  const zones = [
    { id: 1, code: "contiguous", label: data.ZONES.contiguous },
    { id: 2, code: "remote", label: data.ZONES.remote },
  ];
  const tax = data.TAX as Record<string, number>;
  const regions = STATES.map(([code, name], i) => ({ id: i + 1, code, name, zoneId: code === "AK" || code === "HI" ? 2 : 1, taxRate: String(Math.round((tax[code] ?? 0) * 10000) / 100) }));
  const services = data.SERVICES.map((s, i) => ({ id: i + 1, code: s.id, label: s.label, transitMin: s.days[0]!, transitMax: s.days[1]!, position: i + 1 }));
  const offers = data.SERVICES.flatMap((s, i) =>
    Object.entries(s.bands).map(([zone, bands]) => {
      const z = zones.find((x) => x.code === zone)!;
      const paid = (bands as { min: string; price: string }[]).find((b) => b.price !== "0.00") ?? bands[0]!;
      const free = (bands as { min: string; price: string }[]).find((b) => b.price === "0.00" && b.min !== "0.00");
      return { id: 0, serviceId: i + 1, zoneId: z.id, price: paid.price, freeFrom: free?.min ?? null, serviceLabel: `${s.label} · ${z.label}`, transitMin: s.days[0]!, transitMax: s.days[1]! };
    }),
  ).map((o, i) => ({ ...o, id: i + 1 }));
  const shop = data.SHOP;
  const base: ShopBase = {
    settings: {
      name: shop.name,
      email: shop.email,
      phone: null,
      addressLine1: shop.line1,
      addressLine2: null,
      city: shop.city,
      stateCode: shop.state,
      zip: shop.zip,
      takingOrders: true,
      payHoldMinutes: shop.payHoldMinutes,
      transferOn: true,
      transferDays: shop.transferDays,
      returnDays: shop.returnDays,
      refundShippingFaulty: true,
      maxPieces: 30,
      promises: shop.promises,
      about: shop.pages.about.join("\n\n"),
      privacy: shop.pages.privacy.join("\n\n"),
      terms: shop.pages.terms.join("\n\n"),
      reviewLink: null,
    },
    categories,
    regions,
    zones,
    services,
    offers,
    closures: data.CLOSURES.map((c, i) => ({ id: i + 1, from: c.iso, to: c.iso, reason: c.name })),
    giftAmounts: data.GIFT_AMOUNTS.map((a, i) => ({ id: i + 1, amount: a, position: i + 1 })),
    sizeGuides: guides.map(({ key: _key, ...g }) => g),
    facets: options,
  };
  return { products, variants, options, base, regions, offers };
}

export interface FakeCall {
  call: "quote" | "place";
  kind: OrderKind;
  pay: PayMethod;
  body: OrderBody;
  clientKey?: string;
  expect?: string;
}

export interface FakePort extends ShopPort {
  world: ReturnType<typeof sampleWorld>;
  calls: FakeCall[];
  /** What Adminium says of payments; set before the shop loads. */
  offer: PayOffer;
  /** Whether the shopper is signed in (WELCOME10, a bank transfer). */
  signedIn: boolean;
  /** Refuse the next quote or place with this refusal. */
  refuseNext: (refused: Partial<Refused> & { code: string }) => void;
  /** Set how many of a SKU are left (Inventory's figure). */
  setLeft: (sku: string, left: number) => void;
  /** Raise a SKU's price by this much (the price the next dry run says). */
  raise: (sku: string, by: string) => void;
  /** Hold the next answers until let go. */
  hold: () => () => void;
  starts: { via: "link" | "mine"; orderId: Id }[];
  payState: PayState;
  restocks: Id[];
  signups: string[];
  enquiries: Row[];
  /** Which add-ons the shop has; all on unless a test turns one off. */
  featureSet: ShopFeatures;
  /** The after-order door's stand-in. */
  afterFake: FakeAfter;
}

const EST: Record<string, [string, string]> = { standard: ["2026-08-21", "2026-08-25"], express: ["2026-08-20", "2026-08-20"], overnight: ["2026-08-19", "2026-08-19"] };

export function fakePort(): FakePort {
  const world = sampleWorld();
  const calls: FakeCall[] = [];
  const left = new Map(world.variants.map((v) => [v.sku, v.available]));
  const bump = new Map<string, number>();
  let refusal: Refused | null = null;
  let held: Promise<void> | null = null;
  let number = Number(data.NEXT_NUMBER.replace(/\D/g, ""));
  const cards = new Map<string, number>([["H8WD3RTM7Q2K", 5000]]);

  const refuse = (r: Partial<Refused> & { code: string }): ShopError => new ShopError({ status: 400, column: null, child: null, index: null, reason: null, changed: null, retryAfter: null, params: {}, ...r }, r.code);
  const answer = async <T>(run: () => T): Promise<T> => {
    if (held !== null) await held;
    if (refusal !== null) {
      const r = refusal;
      refusal = null;
      throw new ShopError(r, r.code);
    }
    return run();
  };

  const word = (v: { sku: string }): StockWord => {
    const n = left.get(v.sku) ?? 0;
    if (n <= 0) return { state: "out", left: null };
    if (n < data.SHOP.showLeftBelow) return { state: "low", left: n };
    return { state: "in", left: null };
  };

  const figures = (kind: OrderKind, pay: PayMethod, body: OrderBody): Quote => {
    const lines = (body.children.order_lines ?? []).map(({ values }, i) => {
      const v = world.variants.find((x) => String(x.id) === String(values.variant_id));
      if (v === undefined) throw refuse({ code: "PUBLIC_WRITE_REFUSED", child: "order_lines", index: i, column: "variant_id", reason: "not-found" });
      const p = world.products.find((x) => x.id === v.productId)!;
      const each = cents(v.price) + (bump.get(v.sku) ?? 0);
      return { v, p, qty: values.qty, each, line: each * values.qty, discount: 0 };
    });
    const postings = lines.flatMap((l, i) => ((left.get(l.v.sku) ?? 0) < l.qty ? [{ ledger: "stock", state: "refused" as const, reason: "out-of-stock", line: i, path: ["order_lines", i], ...(word(l.v).state === "low" ? { left: String(left.get(l.v.sku)) } : {}) }] : []));
    const applied: Quote["applied"] = [];
    (body.children.order_codes ?? []).forEach(({ values }, i) => {
      const code = data.CODES[values.typed as keyof typeof data.CODES];
      if (code === undefined) throw refuse({ code: "PUBLIC_WRITE_REFUSED", child: "order_codes", index: i, column: "typed", reason: "unknown" });
      if (!code.guests && !port.signedIn) throw refuse({ code: "PUBLIC_WRITE_REFUSED", child: "order_codes", index: i, column: "typed", reason: "needs-sign-in" });
      const on = lines.filter((l) => code.on === null || l.p.world.cat === code.on);
      if (on.length === 0) throw refuse({ code: "PUBLIC_WRITE_REFUSED", child: "order_codes", index: i, column: "typed", reason: "nothing-to-take-off" });
      let off = 0;
      for (const l of on) {
        l.discount = share(l.line, code.percent);
        off += l.discount;
      }
      applied.push({ line: null, name: code.label, kind: "code", amount: fixed(off), typed: true });
    });
    const goods = lines.reduce((n, l) => n + l.line, 0);
    const discount = lines.reduce((n, l) => n + l.discount, 0);
    const net = goods - discount;
    const region = world.regions.find((r) => String(r.id) === String(body.values["region_id"]));
    if (kind === "goods" && region === undefined) throw refuse({ code: "PUBLIC_WRITE_REFUSED", column: "region_id", reason: "required" });
    const offer = world.offers.find((o) => String(o.id) === String(body.values["offer_id"]));
    if (kind === "goods" && (offer === undefined || String(offer.zoneId) !== String(region?.zoneId))) throw refuse({ code: "PUBLIC_WRITE_REFUSED", column: "offer_id", reason: "not-offered" });
    const shipping = kind === "gift" || offer === undefined ? 0 : offer.freeFrom !== null && net >= cents(offer.freeFrom) ? 0 : cents(offer.price);
    const tax = region === undefined ? 0 : Math.round((net * Number(region.taxRate)) / 100);
    const giftRows = (body.children.gift_lines ?? []).map(({ values }) => {
      const amount = world.base.giftAmounts.find((a) => String(a.id) === String(values.amount_id));
      return { amount_id: values.amount_id, amount: amount?.amount ?? "0.00", to_name: values.to_name ?? null, to_email: values.to_email, message: values.message ?? null, sender: body.values["name"] ?? null };
    });
    const gifts = giftRows.reduce((n, g) => n + cents(g.amount), 0);
    const total = net + shipping + tax + gifts;
    let payment: Quote["payment"] = null;
    const card = body.children.payments?.[0]?.values.card_code;
    if (card !== undefined) {
      const balance = cards.get(card);
      if (balance === undefined) throw refuse({ code: "PUBLIC_CARD_REFUSED", status: 409, reason: "not-valid" });
      // A gift card pays for goods, never for another gift card.
      const amount = Math.min(balance, total - gifts);
      payment = { amount: fixed(amount), due: fixed(total - amount) };
    }
    const service = world.base.services.find((s) => String(s.id) === String(offer?.serviceId));
    const est = EST[service?.code ?? "standard"]!;
    return {
      order: {
        status: pay === "online" ? "paying" : "awaiting_transfer",
        kind,
        pay_method: pay,
        region_id: region?.id ?? null,
        state_code: region?.code ?? null,
        offer_id: offer?.id ?? null,
        service_id: offer?.serviceId ?? null,
        tax_rate: region?.taxRate ?? null,
        goods: fixed(goods),
        discount: discount === 0 ? null : fixed(discount),
        net: fixed(net),
        shipping: fixed(shipping),
        tax: fixed(tax),
        gifts: fixed(gifts),
        total: fixed(total),
        paid: fixed(0),
        due: fixed(total),
        pieces: lines.reduce((n, l) => n + l.qty, 0),
        est_ships_by: kind === "goods" ? "2026-08-18" : null,
        est_from: kind === "goods" ? est[0] : null,
        est_to: kind === "goods" ? est[1] : null,
        transfer_by: "2026-08-25",
      },
      lines: lines.map((l) => ({ variant_id: l.v.id, qty: l.qty, sku: l.v.sku, product_id: l.p.id, product_name: l.p.name, colour: l.v.colourLabel, size: l.v.sizeLabel, variant_label: [l.v.colourLabel, l.v.sizeLabel].filter(Boolean).join(" · "), each: fixed(l.each), line: fixed(l.line), discount: l.discount === 0 ? null : fixed(l.discount), returned_qty: 0, returnable: l.qty, reviewed_at: null })),
      gifts: giftRows,
      applied,
      postings,
      payment,
    };
  };

  const list = (query: ProductQuery): ProductPage => {
    let rows = world.products.filter((p) => {
      if (query.categoryId !== undefined && query.categoryId !== null && String(p.categoryId) !== String(query.categoryId)) return false;
      if (query.priceMax !== undefined && query.priceMax !== null && cents(p.price) > cents(query.priceMax)) return false;
      if (query.featured === true && !p.featured) return false;
      const q = (query.q ?? "").trim().toLowerCase();
      if (q.length >= 2 && !p.name.toLowerCase().includes(q) && !p.categoryName.toLowerCase().includes(q)) return false;
      if (query.colour || query.size) {
        const one = world.variants.some((v) => v.productId === p.id && (!query.colour || v.colourCode === query.colour) && (!query.size || v.sizeCode === query.size));
        if (!one) return false;
      }
      return true;
    });
    const by: Record<string, (a: Product, b: Product) => number> = {
      featured: (a, b) => Number(a.id) - Number(b.id),
      newest: (a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "") || Number(a.id) - Number(b.id),
      low: (a, b) => cents(a.price) - cents(b.price) || Number(a.id) - Number(b.id),
      high: (a, b) => cents(b.price) - cents(a.price) || Number(a.id) - Number(b.id),
      name: (a, b) => a.name.localeCompare(b.name),
    };
    rows = [...rows].sort(by[query.sort ?? "featured"]);
    const from = query.cursor ? Number(query.cursor) : 0;
    const limit = query.limit ?? 12;
    const page = rows.slice(from, from + limit);
    return { products: page.map(({ world: _w, ...p }) => p), next: from + limit < rows.length ? String(from + limit) : null, count: from === 0 ? { rows: rows.length, atLeast: false } : null };
  };

  const afterFake = fakeAfter();
  const port: FakePort = {
    world,
    featureSet: { forms: true, offers: true, inventory: true },
    afterFake,
    features: () => ({ ...port.featureSet }),
    after: () => afterFake,
    calls,
    offer: { online: true, test: false },
    signedIn: false,
    starts: [],
    payState: "none",
    restocks: [],
    signups: [],
    enquiries: [],
    refuseNext: (r) => {
      refusal = { status: 400, column: null, child: null, index: null, reason: null, changed: null, retryAfter: null, params: {}, ...r };
    },
    setLeft: (sku, n) => left.set(sku, n),
    raise: (sku, by) => bump.set(sku, (bump.get(sku) ?? 0) + cents(by)),
    hold: () => {
      let release = () => {};
      held = new Promise<void>((resolve) => {
        release = () => {
          held = null;
          resolve();
        };
      });
      return release;
    },
    config: async (): Promise<ShopConfig> => ({ timezone: "America/Los_Angeles", currency: "USD", now: "2026-08-18T18:40:00.000Z" }),
    base: async () => world.base,
    products: (query) => answer(() => list(query)),
    productBySlug: (slug) => answer(() => {
      const p = world.products.find((x) => x.slug === slug);
      if (p === undefined) return null;
      const { world: _w, ...product } = p;
      return product;
    }),
    detail: (productId) =>
      answer((): ProductDetail => ({
        variants: world.variants.filter((v) => String(v.productId) === String(productId)).map(({ available: _a, ...v }) => v),
        options: world.options.filter((o) => String(o.productId) === String(productId)),
        pictures: [],
      })),
    variantsByIds: (ids) => answer(() => world.variants.filter((v) => ids.map(String).includes(String(v.id))).map(({ available: _a, ...v }) => v)),
    variantsOf: (ids) => answer(() => world.variants.filter((v) => ids.map(String).includes(String(v.productId))).map(({ available: _a, ...v }) => v)),
    coloursOf: (ids) => answer(() => world.options.filter((o) => o.kind === "colour" && ids.map(String).includes(String(o.productId)))),
    stock: (ids) => answer(() => Object.fromEntries(world.variants.filter((v) => ids.map(String).includes(String(v.id))).map((v) => [String(v.id), word(v)]))),
    reviews: (productId) =>
      answer((): Reviews => {
        const p = world.products.find((x) => String(x.id) === String(productId))!;
        const mine = data.REVIEWS.filter((r) => r.product === p.slug && r.state === "published").sort((a, b) => b.on.localeCompare(a.on));
        const bars = [5, 4, 3, 2, 1].map((n) => mine.filter((r) => r.stars === n).length) as Reviews["bars"];
        return { count: mine.length, sum: mine.reduce((n, r) => n + r.stars, 0), bars, list: mine.map((r, i) => ({ id: i + 1, stars: r.stars, title: r.title, body: r.body, name: r.name, at: `${r.on}T17:00:00Z` })) };
      }),
    quote: (kind, pay, body) => {
      calls.push({ call: "quote", kind, pay, body });
      return answer(() => {
        if (pay === "transfer" && !port.signedIn) throw refuse({ code: "PUBLIC_REF_NOT_FOUND", status: 404 });
        if (pay === "online" && !port.offer.online) throw refuse({ code: "PUBLIC_SWITCHED_OFF", status: 403 });
        return figures(kind, pay, body);
      });
    },
    place: (kind, pay, body, clientKey, expect) => {
      calls.push({ call: "place", kind, pay, body, clientKey, expect });
      return answer((): Placed => {
        const made = figures(kind, pay, body);
        if (made.postings.some((p) => p.state === "refused")) {
          const p = made.postings.find((x) => x.state === "refused")!;
          throw refuse({ code: "PUBLIC_OUT_OF_STOCK", status: 409, child: "order_lines", index: p.line ?? null, params: p.left === undefined ? {} : { left: p.left } });
        }
        if (made.order["total"] !== expect) throw refuse({ code: "PUBLIC_PRICE_CHANGED", status: 409, changed: { total: String(made.order["total"]), lines: made.lines } });
        const id = number;
        number += 1;
        const online = pay === "online";
        const paid = made.payment !== null && made.payment.due === "0.00";
        const order: Row = { ...made.order, id, number: `NL-${id}`, status: paid ? "paid" : made.order["status"], placed_at: "2026-08-18T18:40:00.000Z", pay_by: online ? "2026-08-18T19:10:00.000Z" : null, transfer_note: online ? null : `NL-${id}`, paid: made.payment?.amount ?? "0.00", due: made.payment?.due ?? made.order["total"] };
        return { ...made, order, replayed: false, link: { token: `LINK${id}CODE00000000` }, payUrl: online && !paid ? `https://pay.example/${id}` : null };
      });
    },
    payments: (): ShopPayments => ({
      available: async () => ({ ...port.offer }),
      start: async (via, orderId) => {
        port.starts.push({ via, orderId });
        return `https://pay.example/${String(orderId)}`;
      },
      state: async () => port.payState,
    }),
    restock: async (variantId) => {
      port.restocks.push(variantId);
    },
    newsSignup: async (email) => {
      port.signups.push(email);
    },
    enquiry: async (values) => {
      port.enquiries.push(values);
    },
    giftCard: async (code) => (code.toUpperCase().endsWith("7Q2K") ? { balance: "50.00", status: "active", expiresOn: null } : null),
  };
  return port;
}
