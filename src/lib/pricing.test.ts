/*
 * The money path (pricing.ts) — line totals, variants, personalization fees,
 * the promo, the tax and the shipping threshold.
 *
 * Everything here is a pure function of hand-built fixtures: no store, no demo
 * catalog, no wall clock. The seed catalog happens to price everything in whole
 * dollars, which hides a whole class of rounding faults, so the fixtures below
 * deliberately use prices with cents — the shape any real backend behind the
 * DataSource contract would return.
 *
 * The rules worth guarding hardest, because each is one "cleanup" away from
 * charging a customer the wrong amount:
 *
 *   1. Tax is charged on goods *after* the discount and *never* on shipping.
 *   2. Free shipping is judged on the PRE-discount subtotal, so a promo can
 *      never claw back a shipping benefit the customer was already shown.
 *   3. The promo is exactly 10% of the subtotal, once. It compounds with a
 *      line-level bundle discount multiplicatively (0.85 × 0.9), never
 *      additively (25% off) — those differ by real money.
 *   4. `total` must always equal sub − disc + ship + tax, to the cent, in both
 *      the returned floats and the printed receipt.
 *
 * Money comparisons use `toBeCloseTo(x, 10)` — a ten-billionth of a dollar.
 * TAX_RATE is not representable in binary, so no product of it is ever exactly
 * the decimal we mean; 1e-10 is far too tight for a genuine cent-level error to
 * hide under. Assertions that are about exact float identity use `toBe`.
 */

import { describe, expect, it } from "vitest";
import {
  FREE_SHIP,
  PROMO_RATE,
  SHIP_EXPRESS,
  SHIP_OVERNIGHT,
  SHIP_STANDARD,
  TAX_RATE,
} from "../data/demo.ts";
import type {
  Cart,
  CartCustom,
  CartLine,
  Order,
  OrderTotals,
  Product,
} from "../data/types.ts";
import { money } from "./format.ts";
import {
  cartArr,
  comboKey,
  computeTotals,
  confTotals,
  count,
  customFee,
  customLabel,
  defaultSel,
  discountOf,
  lineKey,
  normItems,
  optLabel,
  optionsOf,
  round2,
  shipFee,
  subtotalOf,
  unitPrice,
  variantExists,
  variantOf,
  variantStatus,
  type CartLineView,
} from "./pricing.ts";

/* ------------------------------------------------------------------ *
 * Fixtures — small, hand-checkable, and nothing from the demo catalog
 * ------------------------------------------------------------------ */

function product(over: Partial<Product> & Pick<Product, "id" | "price">): Product {
  return {
    title: over.id,
    sku: over.id.toUpperCase(),
    cat: "gear",
    status: "in",
    icon: "box",
    tint: "#101010",
    image: "",
    blurb: "",
    desc: "",
    specs: [],
    ...over,
  };
}

/** No options, no matrix, no personalization — the simplest possible line. */
const PLAIN = product({ id: "plain", price: 20 });
const SOLDOUT = product({ id: "gone", price: 20, status: "out" });

const COLOR_SIZE = [
  {
    key: "color",
    name: "Color",
    type: "swatch" as const,
    values: [
      { id: "black", label: "Black", hex: "#000" },
      { id: "white", label: "White", hex: "#fff" },
    ],
  },
  {
    key: "size",
    name: "Size",
    type: "chip" as const,
    values: [
      { id: "s", label: "Small" },
      { id: "m", label: "Medium" },
      { id: "l", label: "Large" },
    ],
  },
];

/** Six possible combinations, four of them in the matrix. "large" is absent
 * entirely, which is how a combination becomes "na" rather than "out". */
const TEE = product({
  id: "tee",
  price: 20,
  options: COLOR_SIZE,
  variants: {
    "black,s": {},
    "black,m": { d: 6 },
    "white,s": { s: "low" },
    "white,m": { s: "out", d: 6 },
  },
});

/** Same options, but the all-first-values combo ("black,s") is missing — this
 * is the product `defaultSel` has to fall back for. */
const ODD = product({
  id: "odd",
  price: 20,
  options: COLOR_SIZE,
  variants: { "white,m": { d: 6 } },
});

/** Options declared but no matrix at all. */
const LOOSE = product({ id: "loose", price: 20, options: COLOR_SIZE });

const MUG = product({
  id: "mug",
  price: 30,
  custom: {
    mode: "engrave",
    label: "Add engraving",
    verb: "Engraved",
    fee: 8,
    max: 12,
    ph: "e.g. AVA",
    logo: true,
    logoFee: 5,
  },
});

/** Personalization whose logo is free — `logoFee: 0`. */
const TOTE = product({
  id: "tote",
  price: 30,
  custom: {
    mode: "print",
    label: "Add printing",
    verb: "Printed",
    fee: 8,
    max: 16,
    ph: "Name",
    logo: true,
    logoFee: 0,
  },
});

const INDEX: Record<string, Product> = {
  plain: PLAIN,
  gone: SOLDOUT,
  tee: TEE,
  odd: ODD,
  loose: LOOSE,
  mug: MUG,
  tote: TOTE,
};

/** A hand-built line view — the only input the totals functions look at. */
function view(unit: number, qty: number): CartLineView {
  return {
    key: `k:${unit}x${qty}`,
    p: PLAIN,
    opts: {},
    custom: null,
    qty,
    unit,
    orig: unit,
    bundleOff: 0,
    optLabel: "",
    customLabel: "",
  };
}

function line(over: Partial<CartLine> & Pick<CartLine, "pid" | "qty">): CartLine {
  return { opts: {}, custom: null, disc: 0, ...over };
}

/** The receipt as the customer reads it: `money()` output, dollars-and-cents. */
const printed = (n: number): number => Number(money(n).replace(/[$,]/g, ""));

/* ------------------------------------------------------------------ *
 * The rate card
 * ------------------------------------------------------------------ */

describe("the rate card", () => {
  it("is the set of figures every expected value below was hand-derived from", () => {
    /* If this test fails, the arithmetic in the rest of this file is stale —
     * re-derive the expectations, do not "fix" the engine to match them. */
    expect(TAX_RATE).toBe(0.085);
    expect(PROMO_RATE).toBe(0.1);
    expect(FREE_SHIP).toBe(75);
    expect(SHIP_STANDARD).toBe(6);
    expect(SHIP_EXPRESS).toBe(12);
    expect(SHIP_OVERNIGHT).toBe(28);
  });
});

/* ------------------------------------------------------------------ *
 * Options and the variant matrix
 * ------------------------------------------------------------------ */

describe("option combinations", () => {
  it("has no options to read on a plain product", () => {
    expect(optionsOf(PLAIN)).toEqual([]);
    expect(comboKey(PLAIN, {})).toBe("");
  });

  it("joins the selected value ids in the product's declared option order", () => {
    expect(comboKey(TEE, { color: "black", size: "m" })).toBe("black,m");
    /* Declared order wins over the object's key order. */
    expect(comboKey(TEE, { size: "m", color: "black" })).toBe("black,m");
  });

  it("renders an unselected option as an empty segment rather than throwing", () => {
    /* `Array.join` turns undefined into "", so a half-made selection produces
     * a key that simply is not in the matrix — which is exactly why
     * `variantExists` can answer false instead of crashing. */
    expect(comboKey(TEE, {})).toBe(",");
    expect(comboKey(TEE, { color: "black" })).toBe("black,");
    expect(variantExists(TEE, {})).toBe(false);
  });

  it("treats a product with no options as always available", () => {
    expect(variantExists(PLAIN, {})).toBe(true);
    expect(variantExists(PLAIN, { color: "nonsense" })).toBe(true);
  });

  it("accepts every combination when options are declared without a matrix", () => {
    /* No `variants` map means nothing to contradict, so the picker is
     * unconstrained — the matrix is opt-in, not required. */
    expect(variantExists(LOOSE, { color: "black", size: "l" })).toBe(true);
    expect(variantStatus(LOOSE, { color: "black", size: "l" })).toBe("in");
  });

  it("knows which combinations are in the matrix", () => {
    expect(variantExists(TEE, { color: "black", size: "s" })).toBe(true);
    expect(variantExists(TEE, { color: "black", size: "l" })).toBe(false);
  });

  it("synthesises a variant from the product itself when there is no matrix", () => {
    expect(variantOf(PLAIN, {})).toEqual({ s: "in", d: 0 });
    expect(variantOf(SOLDOUT, {})).toEqual({ s: "out", d: 0 });
    expect(variantOf(TEE, { color: "black", size: "l" })).toBeUndefined();
  });

  it("defaults a matrix entry with no status to in-stock", () => {
    /* `"black,s": {}` means "exists, nothing special" — not "unknown". */
    expect(variantStatus(TEE, { color: "black", size: "s" })).toBe("in");
    expect(variantStatus(TEE, { color: "white", size: "s" })).toBe("low");
    expect(variantStatus(TEE, { color: "white", size: "m" })).toBe("out");
  });

  it("reports a combination outside the matrix as 'na', not 'out'", () => {
    /* The two are different states: "out" is a real variant with no stock,
     * "na" is a combination that was never made. Both block add-to-cart, but
     * only "na" means the picker should steer the shopper elsewhere. */
    expect(variantStatus(TEE, { color: "black", size: "l" })).toBe("na");
    expect(variantStatus(TEE, {})).toBe("na");
  });

  it("reports a plain product's own status", () => {
    expect(variantStatus(PLAIN, {})).toBe("in");
    expect(variantStatus(SOLDOUT, {})).toBe("out");
  });
});

describe("the default selection", () => {
  it("is empty for a product with no options", () => {
    expect(defaultSel(PLAIN)).toEqual({});
  });

  it("picks the first value of every option when that combination exists", () => {
    expect(defaultSel(TEE)).toEqual({ color: "black", size: "s" });
  });

  it("falls back to the first combination in the matrix when it does not", () => {
    /* ODD's first-values combo is "black,s", which is not in its matrix. The
     * PDP must not open on a combination it will refuse to sell. */
    expect(defaultSel(ODD)).toEqual({ color: "white", size: "m" });
    expect(variantExists(ODD, defaultSel(ODD))).toBe(true);
  });

  it("keeps the first values when there is no matrix to check against", () => {
    expect(defaultSel(LOOSE)).toEqual({ color: "black", size: "s" });
  });
});

describe("option labels", () => {
  it("is empty for a product with no options", () => {
    expect(optLabel(PLAIN, {})).toBe("");
  });

  it("joins the human labels with a middot", () => {
    expect(optLabel(TEE, { color: "black", size: "m" })).toBe("Black · Medium");
  });

  it("drops an unrecognised value instead of leaving a dangling separator", () => {
    expect(optLabel(TEE, { color: "black", size: "zzz" })).toBe("Black");
    expect(optLabel(TEE, {})).toBe("");
  });
});

/* ------------------------------------------------------------------ *
 * Personalization fees
 * ------------------------------------------------------------------ */

describe("the personalization fee", () => {
  it("is zero unless the product offers it AND the shopper typed something", () => {
    expect(customFee(PLAIN, { text: "AVA", logo: false })).toBe(0);
    expect(customFee(MUG, null)).toBe(0);
    expect(customFee(MUG, { text: "", logo: true })).toBe(0);
  });

  it("charges the base fee, and the logo fee on top", () => {
    expect(customFee(MUG, { text: "AVA", logo: false })).toBe(8);
    expect(customFee(MUG, { text: "AVA", logo: true })).toBe(13);
  });

  it("cannot distinguish a free logo from no logo fee at all", () => {
    /* `logoFee: 0` is falsy, so the ternary takes the same branch it would for
     * an absent fee. Harmless today (the outcome is 0 either way) but it means
     * a "free logo" is expressed by omission, not by a zero. */
    expect(customFee(TOTE, { text: "AVA", logo: true })).toBe(8);
    expect(customFee(TOTE, { text: "AVA", logo: false })).toBe(8);
  });

  it("counts whitespace as text and charges for it", () => {
    /* Only truthiness is tested, not `.trim()`. The PDP trims before building
     * the object so this is not reachable from the UI, but the rule at this
     * seam is "any non-empty string is personalization". */
    expect(customFee(MUG, { text: "   ", logo: false })).toBe(8);
  });

  it("labels the personalization with the product's own verb", () => {
    expect(customLabel(MUG, { text: "AVA", logo: false })).toBe("Engraved: “AVA”");
    expect(customLabel(MUG, { text: "AVA", logo: true })).toBe(
      "Engraved: “AVA” + logo",
    );
    expect(customLabel(TOTE, { text: "AVA", logo: false })).toBe("Printed: “AVA”");
  });

  it("labels nothing when there is nothing to label", () => {
    expect(customLabel(PLAIN, { text: "AVA", logo: true })).toBe("");
    expect(customLabel(MUG, null)).toBe("");
    expect(customLabel(MUG, { text: "", logo: true })).toBe("");
  });
});

/* ------------------------------------------------------------------ *
 * Unit price
 * ------------------------------------------------------------------ */

describe("the unit price", () => {
  it("is the base price for a plain product", () => {
    expect(unitPrice(PLAIN, {}, null)).toBe(20);
  });

  it("adds the variant surcharge", () => {
    expect(unitPrice(TEE, { color: "black", size: "s" }, null)).toBe(20);
    expect(unitPrice(TEE, { color: "black", size: "m" }, null)).toBe(26);
  });

  it("adds the personalization fee on top of the surcharge", () => {
    expect(unitPrice(MUG, {}, { text: "AVA", logo: false })).toBe(38);
    expect(unitPrice(MUG, {}, { text: "AVA", logo: true })).toBe(43);
  });

  it("quotes the base price for a combination that does not exist", () => {
    /* `unitPrice` does not validate — it is `variantStatus` that gates the
     * add-to-cart button. Quoting 0, or NaN, here would be worse. */
    expect(unitPrice(TEE, { color: "black", size: "l" }, null)).toBe(20);
    expect(unitPrice(TEE, {}, null)).toBe(20);
  });
});

/* ------------------------------------------------------------------ *
 * Line identity — which two adds merge into one cart row
 * ------------------------------------------------------------------ */

describe("line identity", () => {
  const custom = (text: string, logo: boolean): CartCustom => ({ text, logo });

  it("merges two identical adds", () => {
    expect(lineKey(PLAIN, {}, null, 0)).toBe(lineKey(PLAIN, {}, null, 0));
  });

  it("separates different products, options, text and logo choices", () => {
    const base = lineKey(TEE, { color: "black", size: "s" }, null, 0);
    expect(base).not.toBe(lineKey(PLAIN, {}, null, 0));
    expect(base).not.toBe(lineKey(TEE, { color: "white", size: "s" }, null, 0));
    expect(lineKey(MUG, {}, custom("AVA", false), 0)).not.toBe(
      lineKey(MUG, {}, custom("EVA", false), 0),
    );
  });

  it("treats a null personalization and an empty one as the same line", () => {
    /* Both mean "no personalization", and both are priced identically, so
     * merging them is correct. */
    expect(lineKey(MUG, {}, null, 0)).toBe(lineKey(MUG, {}, custom("", true), 0));
  });

  it("never merges a discounted line into a full-price one", () => {
    /* The bundle rate is part of the identity: two of the same mug, one at a
     * bundle rate, must stay two rows or the customer loses the discount on
     * the merged quantity. */
    expect(lineKey(PLAIN, {}, null, 0.15)).not.toBe(lineKey(PLAIN, {}, null, 0));
    expect(lineKey(PLAIN, {}, null, 0.15)).not.toBe(lineKey(PLAIN, {}, null, 0.2));
  });

  it("BUG: an engraving ending in '+L' collides with the same text plus a logo", () => {
    /*
     * (a) REAL BUG. `lineKey` appends the literal "+L" to the personalization
     * text to mark the logo, without escaping the text first:
     *
     *     "mug" + "|" + "" + "|" + "e:" + text + (logo ? "+L" : "") + "|b:0"
     *
     * So engraving "AVA+L" with no logo produces byte-for-byte the same key as
     * engraving "AVA" with a logo. Reachable today: the demo's printed tote
     * accepts 16 free-form characters, and the engraved mug 12.
     *
     * The store merges on this key (`c[key] = {...ex, qty: ex.qty + n}`), which
     * keeps the FIRST line's `custom` object and only bumps the quantity. So a
     * shopper who adds one "AVA+L" mug and then one "AVA + logo" mug is
     * charged for two of the first and receives two of the first — and with
     * MUG's logoFee of $5 the two lines are not even the same price ($38 vs
     * $43), so whichever went in first silently sets the price of both.
     */
    expect(unitPrice(MUG, {}, custom("AVA+L", false))).toBe(38);
    expect(unitPrice(MUG, {}, custom("AVA", true))).toBe(43);
    expect(lineKey(MUG, {}, custom("AVA+L", false), 0)).not.toBe(
      lineKey(MUG, {}, custom("AVA", true), 0),
    );
  });
});

/* ------------------------------------------------------------------ *
 * The basket
 * ------------------------------------------------------------------ */

describe("building the cart rows", () => {
  it("is empty for an empty cart", () => {
    expect(cartArr({}, INDEX)).toEqual([]);
    expect(count([])).toBe(0);
    expect(subtotalOf([])).toBe(0);
  });

  it("prices each row from the product, the variant and the personalization", () => {
    const cart: Cart = {
      a: line({ pid: "tee", qty: 2, opts: { color: "black", size: "m" } }),
      b: line({ pid: "mug", qty: 1, custom: { text: "AVA", logo: true } }),
    };
    const rows = cartArr(cart, INDEX);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      key: "a",
      qty: 2,
      unit: 26,
      orig: 26,
      bundleOff: 0,
      optLabel: "Black · Medium",
      customLabel: "",
    });
    expect(rows[1]).toMatchObject({
      qty: 1,
      unit: 43,
      customLabel: "Engraved: “AVA” + logo",
    });
    expect(count(rows)).toBe(3);
    expect(subtotalOf(rows)).toBe(95); // 26×2 + 43
  });

  it("applies the bundle rate to the unit and keeps the original for the strike-through", () => {
    const rows = cartArr({ a: line({ pid: "plain", qty: 2, disc: 0.15 }) }, INDEX);
    expect(rows[0].orig).toBe(20);
    expect(rows[0].unit).toBe(17);
    expect(rows[0].bundleOff).toBe(0.15);
    expect(subtotalOf(rows)).toBe(34);
  });

  it("discounts the personalization fee along with the product", () => {
    /* The bundle rate is applied to the whole unit price, fee included — an
     * engraved mug in a bundle is 15% off the $38, not 15% off the $30. */
    const rows = cartArr(
      { a: line({ pid: "mug", qty: 1, custom: { text: "AVA", logo: false }, disc: 0.5 }) },
      INDEX,
    );
    expect(rows[0].unit).toBe(19);
  });

  it("silently drops a row whose product has left the catalog", () => {
    /* A discontinued product vanishes from the cart rather than crashing the
     * page or billing for a product with no price. The shopper is not told. */
    const rows = cartArr(
      { a: line({ pid: "ghost", qty: 3 }), b: line({ pid: "plain", qty: 1 }) },
      INDEX,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].p.id).toBe("plain");
  });

  it("tolerates a line with no options or personalization recorded", () => {
    /* Legacy/hand-written cart entries; the `|| {}` and `|| null` guards. */
    const rough = { pid: "plain", qty: 1 } as unknown as CartLine;
    const rows = cartArr({ a: rough }, INDEX);
    expect(rows[0]).toMatchObject({ opts: {}, custom: null, unit: 20 });
  });

  it("counts and sums a zero-quantity row as nothing, without dropping it", () => {
    /* `add(pid, 0)` is reachable programmatically; the row survives so the
     * shopper can see and remove it, but it must not move the total. */
    const rows = cartArr({ a: line({ pid: "plain", qty: 0 }) }, INDEX);
    expect(rows).toHaveLength(1);
    expect(count(rows)).toBe(0);
    expect(subtotalOf(rows)).toBe(0);
  });

  it("lets a negative quantity subtract, exactly as arithmetic implies", () => {
    /* Nothing clamps qty. The UI cannot produce this (`dec` deletes the row at
     * zero) but the functions are honest about it rather than silently
     * treating -2 as 0 — see the negative-basket total below. */
    expect(count([view(20, 3), view(20, -2)])).toBe(1);
    expect(subtotalOf([view(20, 3), view(20, -2)])).toBe(20);
  });

  it("lets a bundle rate above 1 turn a line into a credit", () => {
    /* `unit = full × (1 − d)` with no clamp on d. Not reachable — nothing in
     * the app passes a rate at all today (BUNDLE_OFF is unused) — but if a
     * promotion ever feeds this a rate over 1 the line pays the shopper. */
    expect(cartArr({ a: line({ pid: "plain", qty: 1, disc: 1 }) }, INDEX)[0].unit).toBe(0);
    expect(cartArr({ a: line({ pid: "plain", qty: 1, disc: 1.5 }) }, INDEX)[0].unit).toBe(-10);
  });
});

/* ------------------------------------------------------------------ *
 * Shipping — the threshold, at the boundary and a cent either side
 * ------------------------------------------------------------------ */

describe("the shipping fee", () => {
  it("is free on an empty basket, whatever method is selected", () => {
    expect(shipFee(0, "standard")).toBe(0);
    expect(shipFee(0, "express")).toBe(0);
    expect(shipFee(0, "overnight")).toBe(0);
  });

  it("charges standard shipping up to one cent below the threshold", () => {
    expect(shipFee(74.99, "standard")).toBe(6);
  });

  it("is free at exactly the threshold", () => {
    /* `>=`, not `>`. A basket of exactly $75.00 ships free — the cart's
     * "add $X more for free shipping" nudge reaches zero at the same point. */
    expect(shipFee(75, "standard")).toBe(0);
  });

  it("stays free one cent past the threshold", () => {
    expect(shipFee(75.01, "standard")).toBe(0);
  });

  it("charges a flat fee for express and overnight however large the basket", () => {
    /* Free shipping is a *standard*-shipping benefit only. A $500 basket that
     * chooses overnight still pays $28. */
    expect(shipFee(500, "express")).toBe(12);
    expect(shipFee(500, "overnight")).toBe(28);
    expect(shipFee(1, "express")).toBe(12);
  });

  it("charges standard shipping on a negative subtotal", () => {
    /* Only *exactly* zero is special-cased, so a credit basket is billed the
     * $6. Unreachable through the UI; documented because the zero check is a
     * strict equality and would be easy to "simplify" into `<= 0`. */
    expect(shipFee(-50, "standard")).toBe(6);
  });
});

/* ------------------------------------------------------------------ *
 * The promo
 * ------------------------------------------------------------------ */

describe("the promo discount", () => {
  it("is nothing when it is off", () => {
    expect(discountOf(100, false)).toBe(0);
    expect(discountOf(0, true)).toBe(0);
  });

  it("is exactly one tenth of the subtotal", () => {
    expect(discountOf(100, true)).toBeCloseTo(10, 10);
    expect(discountOf(45.5, true)).toBeCloseTo(4.55, 10);
  });

  it("cannot stack with itself", () => {
    /*
     * The discount is a function of the subtotal alone, and the store holds
     * `promoOn` as a boolean — so applying WELCOME10 twice is the same as
     * applying it once. The invariant that guarantees it: the discount is
     * always PROMO_RATE × the *original* subtotal, never a percentage of an
     * already-discounted figure.
     */
    const lines = [view(45.5, 2)];
    const once = computeTotals(lines, "standard", true);
    const again = computeTotals(lines, "standard", true);
    expect(again).toEqual(once);
    expect(once.disc).toBe(once.sub * PROMO_RATE);
  });

  it("compounds with a line-level bundle rate instead of adding to it", () => {
    /*
     * A $100 item at a 15% bundle rate enters the basket at $85; the 10% promo
     * then comes off the $85, not off the $100. The customer pays $76.50 for
     * the goods — NOT the $75.00 that "15% + 10% = 25% off" would suggest.
     * The two rates multiply (0.85 × 0.9 = 0.765). Getting this wrong is $1.50
     * per hundred, in the merchant's favour or the customer's depending on
     * which way someone "fixes" it.
     */
    const rows = cartArr({ a: line({ pid: "plain", qty: 5, disc: 0.15 }) }, INDEX);
    expect(subtotalOf(rows)).toBe(85); // 20 × 0.85 × 5
    const t = computeTotals(rows, "standard", true);
    expect(t.disc).toBeCloseTo(8.5, 10);
    expect(t.sub - t.disc).toBeCloseTo(76.5, 10);
    expect(t.sub - t.disc).not.toBe(75);
  });
});

/* ------------------------------------------------------------------ *
 * The order total
 * ------------------------------------------------------------------ */

describe("the order total", () => {
  it("is all zeros for an empty basket, even on overnight with a promo", () => {
    const t = computeTotals([], "overnight", true);
    expect(t).toEqual({
      sub: 0,
      disc: 0,
      ship: 0,
      shipFree: true,
      tax: 0,
      total: 0,
    });
  });

  it("adds tax and standard shipping to a small basket", () => {
    /* $20 goods → $1.70 tax → $6 shipping → $27.70. */
    const t = computeTotals([view(20, 1)], "standard", false);
    expect(t.sub).toBe(20);
    expect(t.disc).toBe(0);
    expect(t.ship).toBe(6);
    expect(t.shipFree).toBe(false);
    expect(t.tax).toBeCloseTo(1.7, 10);
    expect(t.total).toBeCloseTo(27.7, 10);
  });

  it("multiplies out quantity before anything else", () => {
    const t = computeTotals([view(20, 3), view(5, 1)], "standard", false);
    expect(t.sub).toBe(65);
    /* Rounded to the cent — see `round2` in pricing.ts. The engine now emits
     * what the receipt prints, so 5.525 becomes 5.53 and the total follows. */
    expect(t.tax).toBe(5.53);
    expect(t.total).toBe(76.53);
  });

  it("never charges tax on the shipping fee", () => {
    /* $100 of goods shipped overnight is taxed on $100, not on $128. The
     * difference is $2.38 — small enough to go unnoticed, large enough to be
     * a real overcharge. */
    const t = computeTotals([view(100, 1)], "overnight", false);
    expect(t.ship).toBe(28);
    expect(t.tax).toBeCloseTo(8.5, 10);
    expect(t.tax).not.toBeCloseTo(10.88, 10);
    expect(t.total).toBeCloseTo(136.5, 10);
  });

  it("taxes the basket after the discount, not before", () => {
    /* $100 goods, 10% off → tax is charged on $90 ($7.65), not on $100. */
    const t = computeTotals([view(100, 1)], "standard", true);
    expect(t.disc).toBeCloseTo(10, 10);
    expect(t.tax).toBeCloseTo(7.65, 10);
    expect(t.ship).toBe(0);
    expect(t.total).toBeCloseTo(97.65, 10);
  });

  it("charges shipping at exactly one cent below the free threshold", () => {
    const t = computeTotals([view(74.99, 1)], "standard", false);
    expect(t.ship).toBe(6);
    expect(t.shipFree).toBe(false);
    /* Rounded to the cent by `round2` — 6.37415 → 6.37, and the total is
     * derived from the rounded parts, so it lands on 87.36 not 87.36415. */
    expect(t.tax).toBe(6.37);
    expect(t.total).toBe(87.36);
  });

  it("ships free at exactly the threshold", () => {
    const t = computeTotals([view(75, 1)], "standard", false);
    expect(t.ship).toBe(0);
    expect(t.shipFree).toBe(true);
    /* 81.375 rounds to 81.38 — a receipt cannot show a third of a cent. */
    expect(t.total).toBe(81.38);
  });

  it("ships free one cent past the threshold", () => {
    const t = computeTotals([view(75.01, 1)], "standard", false);
    expect(t.ship).toBe(0);
    expect(t.shipFree).toBe(true);
  });

  it("reaches the threshold by quantity, not just by unit price", () => {
    /* 3 × $25.00 is exactly $75.00. */
    expect(computeTotals([view(25, 3)], "standard", false).ship).toBe(0);
    expect(computeTotals([view(24.99, 3)], "standard", false).ship).toBe(6);
  });

  it("judges free shipping on the pre-discount subtotal", () => {
    /*
     * The obvious reading — "free over $75 of what you actually pay" — is
     * wrong here, deliberately. A $80 basket with WELCOME10 pays $72 for the
     * goods and still ships free, because `shipFee` is handed `sub`, not
     * `taxable`. Checkout's shipping-method card makes the same call, so the
     * two agree; switching this to the post-discount figure would surprise a
     * shopper by adding $6 the moment they applied a discount code.
     */
    const t = computeTotals([view(80, 1)], "standard", true);
    expect(t.sub).toBe(80);
    expect(t.disc).toBeCloseTo(8, 10);
    expect(t.sub - t.disc).toBeCloseTo(72, 10); // below the threshold …
    expect(t.ship).toBe(0); // … and still free
    expect(t.shipFree).toBe(true);
  });

  it("still ships free at exactly the threshold with the promo applied", () => {
    const t = computeTotals([view(75, 1)], "standard", true);
    expect(t.disc).toBe(7.5);
    expect(t.ship).toBe(0);
    /* 5.7375 → 5.74, and the total is derived from the rounded parts:
     * 75.00 − 7.50 + 0 + 5.74 = 73.24. */
    expect(t.tax).toBe(5.74);
    expect(t.total).toBe(73.24);
  });

  it("reports shipFree for a paid express fee as false", () => {
    const t = computeTotals([view(500, 1)], "express", false);
    expect(t.ship).toBe(12);
    expect(t.shipFree).toBe(false);
  });

  it("keeps total identical to sub − disc + ship + tax, exactly", () => {
    /* The one invariant the whole screen depends on. Exact float identity,
     * not an approximation: `computeTotals` computes the total from the very
     * same terms it reports, so any drift here means the parts and the total
     * came from different arithmetic. */
    const baskets: CartLineView[][] = [
      [],
      [view(20, 1)],
      [view(74.99, 1)],
      [view(19.99, 3), view(4.95, 2)],
      [view(500, 2)],
    ];
    for (const lines of baskets) {
      for (const ship of ["standard", "express", "overnight"] as const) {
        for (const promo of [false, true]) {
          const t = computeTotals(lines, ship, promo);
          /*
           * The parts now agree with the total EXACTLY, because every one of
           * them is rounded to the cent before it leaves the engine — this
           * used to be a raw float comparison that happened to hold only
           * while every seeded price was a whole dollar. `round2` on the
           * right-hand side absorbs the last-bit residue of re-adding them.
           */
          expect(t.total).toBe(round2(t.sub - t.disc + t.ship + t.tax));
        }
      }
    }
  });

  it("clamps the taxable amount at zero but not the shipping fee", () => {
    /*
     * A negative basket (only reachable programmatically) has its tax clamped
     * to zero by `Math.max(0, sub - disc)` — but `shipFee` still bills $6, so
     * a −$40 basket totals +$6 and `total` no longer equals sub − disc + ship
     * + tax. The clamp protects one term and not the other.
     */
    const t = computeTotals([view(20, -2)], "standard", false);
    expect(t.sub).toBe(-40);
    expect(t.tax).toBe(0);
    expect(t.ship).toBe(6);
    expect(t.total).toBe(6);
    expect(t.total).not.toBe(t.sub - t.disc + t.ship + t.tax);
  });

  it("BUG: the printed receipt does not add up once a price carries cents", () => {
    /*
     * (a) REAL BUG. Nothing in pricing.ts rounds to the cent — every figure is
     * a raw float, and `money()` rounds each one independently at render time.
     * When a fraction of a cent lands in two places the printed lines and the
     * printed total disagree.
     *
     * Basket: one item at $174.25, WELCOME10 applied, free shipping (≥ $75).
     *
     *   Subtotal   $174.25
     *   Discount  − $17.43   (17.425 exactly — rounded up on screen)
     *   Shipping     Free
     *   Tax        $13.33   (13.330125)
     *   ---------------------
     *   as printed $170.15
     *   Total      $170.16   (170.155125 — rounded up again)
     *
     * The customer is billed a cent more than the lines they were shown. This
     * is masked in the shipped demo only because every seed price is a whole
     * dollar, which keeps every subtotal an integer; the DataSource contract
     * exists precisely so the catalog can be swapped for a real one, and the
     * first price ending in .95 or .99 exposes it. The fix belongs in the
     * engine (round each component to the cent, then derive the total from the
     * rounded parts) — not in the formatter.
     */
    const t = computeTotals([view(174.25, 1)], "standard", true);
    expect(t.sub).toBe(174.25);
    expect(printed(t.sub)).toBe(174.25);
    expect(printed(t.disc)).toBe(17.43);
    expect(printed(t.ship)).toBe(0);
    expect(printed(t.tax)).toBe(13.33);

    const asPrinted =
      printed(t.sub) - printed(t.disc) + printed(t.ship) + printed(t.tax);
    expect(asPrinted).toBe(170.15);
    expect(printed(t.total)).toBe(asPrinted);
  });
});

/* ------------------------------------------------------------------ *
 * Placed and seeded orders
 * ------------------------------------------------------------------ */

describe("normalising order items", () => {
  it("is empty for an order with no items recorded", () => {
    expect(normItems(undefined, INDEX)).toEqual([]);
    expect(normItems([], INDEX)).toEqual([]);
  });

  it("re-prices a [pid, qty] pair at today's catalog price", () => {
    /* Seeded history stores only the pair, so the order's line price follows
     * the catalog. A price change rewrites what an old order appears to have
     * cost — acceptable for demo history, wrong for a real receipt. */
    expect(normItems([["plain", 2]], INDEX)).toEqual([
      { pid: "plain", qty: 2, unit: 20, optLabel: "", customLabel: "" },
    ]);
  });

  it("prices a pair for a discontinued product at zero rather than crashing", () => {
    expect(normItems([["ghost", 1]], INDEX)[0]).toMatchObject({ pid: "ghost", unit: 0 });
  });

  it("keeps the unit price a placed order recorded, ignoring the catalog", () => {
    /* This is what makes a placed order a record rather than a live quote. */
    const items = normItems(
      [{ pid: "plain", qty: 1, unit: 12.5, optLabel: "Black", customLabel: "Engraved" }],
      INDEX,
    );
    expect(items[0]).toEqual({
      pid: "plain",
      qty: 1,
      unit: 12.5,
      optLabel: "Black",
      customLabel: "Engraved",
    });
  });

  it("keeps a recorded unit price of zero instead of falling back to the catalog", () => {
    /* The guard is `it.unit != null`, not `it.unit ||` — so a genuinely free
     * line (a gift, a comp) stays free. Written as `||` this would silently
     * bill $20 for something the customer was given. */
    expect(normItems([{ pid: "plain", qty: 1, unit: 0 }], INDEX)[0].unit).toBe(0);
  });

  it("falls back to the catalog price only when no unit was recorded", () => {
    expect(normItems([{ pid: "plain", qty: 1 }], INDEX)[0].unit).toBe(20);
    expect(normItems([{ pid: "ghost", qty: 1 }], INDEX)[0].unit).toBe(0);
    expect(normItems([{ pid: "plain", qty: 1 }], INDEX)[0].optLabel).toBe("");
  });
});

describe("order totals", () => {
  const order = (over: Partial<Order>): Order => ({ number: "1", items: [], ...over });

  it("returns the stored totals untouched when the order has them", () => {
    /* Identity, not a recomputation: an order placed under a different tax
     * rate or promo must keep printing the figures the customer agreed to,
     * even if they no longer match what today's engine would produce. */
    const stored: OrderTotals = {
      sub: 1,
      disc: 2,
      ship: 3,
      shipFree: false,
      tax: 4,
      total: 999,
    };
    const o = order({ items: [["plain", 1]], totals: stored });
    expect(confTotals(o, INDEX)).toBe(stored);
  });

  it("reconstructs a seeded order from its items and ship method", () => {
    /* 2 × $20 = $40 → under the threshold → $6 standard → $3.40 tax. */
    const t = confTotals(order({ items: [["plain", 2]], ship: "standard" }), INDEX);
    expect(t.sub).toBe(40);
    expect(t.disc).toBe(0);
    expect(t.ship).toBe(6);
    expect(t.shipFree).toBe(false);
    expect(t.tax).toBeCloseTo(3.4, 10);
    expect(t.total).toBeCloseTo(49.4, 10);
  });

  it("applies the same free-shipping threshold when reconstructing", () => {
    expect(confTotals(order({ items: [["plain", 4]] }), INDEX).ship).toBe(0); // $80
    expect(confTotals(order({ items: [["plain", 3]] }), INDEX).ship).toBe(6); // $60
  });

  it("prefers shipMethod, then the legacy ship field, then standard", () => {
    const items: Order["items"] = [["plain", 1]];
    expect(confTotals(order({ items, shipMethod: "overnight", ship: "express" }), INDEX).ship).toBe(28);
    expect(confTotals(order({ items, ship: "express" }), INDEX).ship).toBe(12);
    expect(confTotals(order({ items }), INDEX).ship).toBe(6);
  });

  it("ignores a promo the order says was applied", () => {
    /*
     * The reconstruction hard-codes `disc: 0` and taxes the full subtotal, so
     * `promoOn` is dropped. Not reachable today — `placeOrder` always stores
     * `totals`, so only seeded orders take this path and none of them carry a
     * promo — but the field is on the type and reads as if it were honoured.
     */
    const t = confTotals(order({ items: [["plain", 5]], promoOn: true }), INDEX);
    expect(t.sub).toBe(100);
    expect(t.disc).toBe(0);
    expect(t.tax).toBeCloseTo(8.5, 10);
  });

  it("BUG: charges $6 shipping on an order with nothing in it", () => {
    /*
     * (a) REAL BUG. `confTotals` re-implements the shipping rule inline
     * instead of calling `shipFee`, and the copy is missing the
     * `subtotal === 0 → free` case. So a $0 order reconstructs as $0 subtotal,
     * $0 tax and $6.00 total, while `computeTotals` — the same rule, on the
     * live cart — returns zero across the board.
     *
     * Not reachable with the seeded orders (they all carry items that are in
     * the catalog), but it is reachable the moment a product is discontinued:
     * `normItems` prices an unknown pid at 0, so an order whose every item has
     * been delisted renders as "Subtotal $0.00 / Shipping $6.00 / Total $6.00".
     * Two implementations of one rule, drifted at the boundary.
     */
    const empty = confTotals(order({ items: [] }), INDEX);
    const ghost = confTotals(order({ items: [["ghost", 2]] }), INDEX);
    expect(empty.sub).toBe(0);
    expect(ghost.sub).toBe(0);
    expect(computeTotals([], "standard", false).total).toBe(0);
    expect(empty.ship).toBe(0);
    expect(empty.total).toBe(0);
  });
});
