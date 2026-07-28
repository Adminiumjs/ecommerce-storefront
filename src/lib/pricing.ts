// The cart engine + variant matrix — the load-bearing commerce logic, ported
// faithfully from the comp. Pure functions only; state lives in the store.

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
  OptionSelection,
  Order,
  OrderItem,
  OrderTotals,
  Product,
  ShipMethod,
  Stock,
} from "../data/types.ts";

export type VariantStatus = Stock | "na";

export function optionsOf(p: Product) {
  return p.options || [];
}

export function comboKey(p: Product, opts: OptionSelection): string {
  return optionsOf(p)
    .map((o) => opts[o.key])
    .join(",");
}

export function variantOf(p: Product, opts: OptionSelection) {
  if (!p.variants) return { s: p.status, d: 0 };
  return p.variants[comboKey(p, opts)];
}

export function variantExists(p: Product, opts: OptionSelection): boolean {
  if (!optionsOf(p).length || !p.variants) return true;
  return !!p.variants[comboKey(p, opts)];
}

export function variantStatus(p: Product, opts: OptionSelection): VariantStatus {
  const v = variantOf(p, opts);
  return v ? v.s || "in" : "na";
}

export function customFee(p: Product, custom: CartCustom | null): number {
  if (!p.custom || !custom || !custom.text) return 0;
  return (
    (p.custom.fee || 0) +
    (custom.logo && p.custom.logoFee ? p.custom.logoFee : 0)
  );
}

export function unitPrice(
  p: Product,
  opts: OptionSelection,
  custom: CartCustom | null,
): number {
  const v = variantOf(p, opts);
  return p.price + ((v && v.d) || 0) + customFee(p, custom);
}

export function lineKey(
  p: Product,
  opts: OptionSelection,
  custom: CartCustom | null,
  disc: number,
): string {
  return (
    p.id +
    "|" +
    comboKey(p, opts || {}) +
    "|" +
    /*
     * The logo flag lives in its OWN delimited field. Appending "+L" to the
     * engraving meant text that itself ended in "+L" produced the same key as
     * that text minus the suffix plus a logo — two different products, one
     * cart line, and the second configuration silently discarded.
     */
    (custom && custom.text
      ? "e:" + custom.text + "|logo:" + (custom.logo ? "1" : "0")
      : "") +
    "|b:" +
    (disc || 0)
  );
}

export function optLabel(p: Product, opts: OptionSelection): string {
  if (!optionsOf(p).length) return "";
  return optionsOf(p)
    .map((o) => {
      const v = o.values.find((x) => x.id === (opts || {})[o.key]);
      return v ? v.label : "";
    })
    .filter(Boolean)
    .join(" · ");
}

export function customLabel(p: Product, custom: CartCustom | null): string {
  if (!p.custom || !custom || !custom.text) return "";
  return (
    p.custom.verb + ': “' + custom.text + '”' + (custom.logo ? " + logo" : "")
  );
}

/** The default option selection for a PDP — falls back to the first existing
 * variant when the all-first-value combo has no entry. */
export function defaultSel(p: Product): OptionSelection {
  const opts = optionsOf(p);
  if (!opts.length) return {};
  const sel: OptionSelection = {};
  opts.forEach((o) => {
    sel[o.key] = o.values[0].id;
  });
  if (variantExists(p, sel)) return sel;
  const keys = Object.keys(p.variants || {});
  if (keys.length) {
    const parts = keys[0].split(",");
    opts.forEach((o, i) => {
      sel[o.key] = parts[i];
    });
  }
  return sel;
}

export interface CartLineView {
  key: string;
  p: Product;
  opts: OptionSelection;
  custom: CartCustom | null;
  qty: number;
  /** Per-unit price after any bundle discount. */
  unit: number;
  /** Per-unit price before the bundle discount. */
  orig: number;
  bundleOff: number;
  optLabel: string;
  customLabel: string;
}

export function cartArr(
  cart: Cart,
  index: Record<string, Product>,
): CartLineView[] {
  return Object.keys(cart)
    .map((k): CartLineView | null => {
      const l = cart[k];
      const p = index[l.pid];
      if (!p) return null;
      const full = unitPrice(p, l.opts || {}, l.custom);
      const d = l.disc || 0;
      return {
        key: k,
        p,
        opts: l.opts || {},
        custom: l.custom || null,
        qty: l.qty,
        unit: full * (1 - d),
        orig: full,
        bundleOff: d,
        optLabel: optLabel(p, l.opts || {}),
        customLabel: customLabel(p, l.custom),
      };
    })
    .filter((x): x is CartLineView => x !== null);
}

export function count(lines: CartLineView[]): number {
  return lines.reduce((s, x) => s + x.qty, 0);
}

export function subtotalOf(lines: CartLineView[]): number {
  return lines.reduce((s, x) => s + x.unit * x.qty, 0);
}

/**
 * Round to whole cents.
 *
 * Money must not carry binary-float residue: a receipt whose tax is
 * 12.157999999 renders fine but makes `sub + ship + tax` disagree with the
 * sum of the printed lines by a cent. Every figure a customer can read is
 * rounded here before it leaves.
 */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function shipFee(subtotal: number, ship: ShipMethod): number {
  if (subtotal === 0) return 0;
  if (ship === "express") return SHIP_EXPRESS;
  if (ship === "overnight") return SHIP_OVERNIGHT;
  return subtotal >= FREE_SHIP ? 0 : SHIP_STANDARD;
}

export function discountOf(subtotal: number, promoOn: boolean): number {
  return promoOn ? subtotal * PROMO_RATE : 0;
}

export interface Totals {
  sub: number;
  disc: number;
  ship: number;
  shipFree: boolean;
  tax: number;
  total: number;
}

export function computeTotals(
  lines: CartLineView[],
  ship: ShipMethod,
  promoOn: boolean,
): Totals {
  const fee = shipFee(subtotalOf(lines), ship);

  /*
   * Round every component to the cent, then derive the total FROM THE ROUNDED
   * PARTS — not from the raw floats.
   *
   * `money()` rounds each figure independently at render time, so a total
   * derived from unrounded values can disagree with the lines printed above
   * it. One item at $174.25 with WELCOME10 showed Subtotal 174.25, Discount
   * 17.43, Tax 13.33 — which reads as 170.15 — beside a total of 170.16. The
   * customer was billed a cent more than the lines they were shown.
   *
   * Tax is still assessed on the unrounded taxable base; only the figure that
   * leaves this function is rounded.
   */
  const rawSub = subtotalOf(lines);
  const rawDisc = discountOf(rawSub, promoOn);
  const taxable = Math.max(0, rawSub - rawDisc);

  const sub = round2(rawSub);
  const disc = round2(rawDisc);
  const tax = round2(taxable * TAX_RATE);

  return {
    sub,
    disc,
    ship: fee,
    shipFree: fee === 0,
    tax,
    /* The goods portion is clamped at zero — a discount larger than the basket
     * must not produce a negative bill — but shipping is still charged. */
    total: round2(Math.max(0, sub - disc) + fee + tax),
  };
}

export interface NormItem {
  pid: string;
  qty: number;
  unit: number;
  optLabel: string;
  customLabel: string;
}

/** Normalize seeded/placed order items (pairs or rich items) into a uniform
 * shape for the confirm/account views. */
export function normItems(
  items: OrderItem[] | undefined,
  index: Record<string, Product>,
): NormItem[] {
  return (items || []).map((it) => {
    if (Array.isArray(it)) {
      const p = index[it[0]];
      return {
        pid: it[0],
        qty: it[1],
        unit: p ? p.price : 0,
        optLabel: "",
        customLabel: "",
      };
    }
    return {
      pid: it.pid,
      qty: it.qty,
      unit: it.unit != null ? it.unit : (index[it.pid]?.price || 0),
      optLabel: it.optLabel || "",
      customLabel: it.customLabel || "",
    };
  });
}

/** Totals for an order — uses its stored totals when present, otherwise
 * reconstructs them from the items + ship method (seeded orders). */
export function confTotals(
  o: Order,
  index: Record<string, Product>,
): OrderTotals {
  if (o.totals) return o.totals;
  const ni = normItems(o.items, index);
  const sub = ni.reduce((s, it) => s + it.unit * it.qty, 0);
  const m = o.shipMethod || o.ship || "standard";
  /*
   * Use `shipFee`, do not re-implement it.
   *
   * This branch was a hand-copied duplicate of the same rule and had drifted:
   * it was missing the `subtotal === 0 → free` case, so an order whose items
   * have all been delisted (`normItems` prices an unknown pid at 0) rendered
   * as "Subtotal $0.00 / Shipping $6.00 / Total $6.00" while the live cart,
   * on the same rule, showed zero.
   */
  const ship = shipFee(sub, m as ShipMethod);
  const tax = round2(sub * TAX_RATE);
  return {
    sub,
    disc: 0,
    ship,
    shipFree: ship === 0,
    tax,
    total: round2(sub + ship + tax),
  };
}
