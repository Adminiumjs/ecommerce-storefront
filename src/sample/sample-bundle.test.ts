/**
 * THE SAMPLE FILES, THEIR SOURCE, THE TABLES AND THE FIGURES AGREE.
 *
 * `seeds/ecommerce-shop.sample.json` and `seeds/ecommerce-shop.inventory.sample.json`
 * are what an operator adds from Adminium. They are written from
 * `northline.ts` (`npm run sample`); this fails when a file and the source
 * drift, when a row names a column the table does not have or one Adminium
 * decides, and when the figures the designs show (`figures.md`) cannot be
 * worked out again from the rows written and the variants' prices, by the
 * money rules the tables keep.
 *
 * Every moment is read at the sample's own clock, Tuesday 18 August 2026,
 * 11:40: added then, a `@week` day and a plain one fall on the same date.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { inventoryText, sampleText } from "../../scripts/write-sample.ts";
import { TABLES, type Column } from "../manifest/tables.ts";
import { addDays, addShipDays, cents, dollars, NOW_TIME, shipsBy, stockName, taxPercent, TODAY, WORLD } from "./northline.ts";

type Row = Record<string, unknown>;
interface Bundle {
  format: string;
  app: string;
  addOn?: string;
  weekAnchor?: string;
  tables: { ref: string; own?: true; onlyIfEmpty?: true; rows: Row[] }[];
  moves?: { ref?: string; table?: string; to: string }[];
}
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");
const main = JSON.parse(read("seeds/ecommerce-shop.sample.json")) as Bundle;
const stock = JSON.parse(read("seeds/ecommerce-shop.inventory.sample.json")) as Bundle;
const rowsOf = (bundle: Bundle, ref: string): Row[] => bundle.tables.find((t) => t.ref === ref)?.rows ?? [];
const refOf = (v: unknown): string => (v as { "@ref": string })["@ref"];

// ── reading a sample moment at the clock ────────────────────────────────────

const minutesOf = (hm: string) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5));
const NOW = `${TODAY}T${NOW_TIME}`;
const shift = (moment: string, minutes: number): string => {
  const total = minutesOf(moment.slice(11)) + minutes;
  const days = Math.floor(total / 1440);
  const rest = total - days * 1440;
  return `${addDays(moment.slice(0, 10), days)}T${String(Math.floor(rest / 60)).padStart(2, "0")}:${String(rest % 60).padStart(2, "0")}`;
};
const duration = (d: string): number => {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(d);
  if (m === null) throw new Error(`not a duration of hours and minutes: ${d}`);
  return Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0);
};
/** A moment or a day as the sample writes it, read at the clock: "2026-07-21T09:02", or "2026-09-07" for a date. */
function at(v: unknown): string {
  const o = v as Row;
  if (typeof o["@ago"] === "string") return shift(NOW, -duration(o["@ago"]));
  if (typeof o["@in"] === "string") return shift(NOW, duration(o["@in"]));
  if (typeof o["@day"] === "number") {
    const day = addDays(TODAY, o["@day"]);
    return typeof o["@time"] === "string" ? `${day}T${o["@time"]}` : day;
  }
  throw new Error(`not a sample moment: ${JSON.stringify(v)}`);
}

// ── the figures the designs show ────────────────────────────────────────────

const FIGURES = new Map(
  read("src/sample/figures.md")
    .split("\n")
    .filter((line) => /^\| [^|]+ \| [^|]+ \|$/.test(line))
    .map((line) => line.split("|").map((cell) => cell.trim()))
    .map(([, figure, value]) => [figure!, value!]),
);
const figure = (name: string): string => {
  const value = FIGURES.get(name);
  if (value === undefined) throw new Error(`figures.md has no "${name}"`);
  return value;
};
const money = (name: string): number => cents(figure(name).replace("$", ""));

// ── the rows, joined ────────────────────────────────────────────────────────

const byLabel = (bundle: Bundle, ref: string) => new Map(rowsOf(bundle, ref).map((r) => [String(r["@label"]), r]));
const products = byLabel(main, "products");
const variants = byLabel(main, "variants");
const orders = rowsOf(main, "orders");
const offers = byLabel(main, "shipping_offers");
const regions = byLabel(main, "regions");
const giftAmounts = byLabel(main, "gift_amounts");
const categoryOf = (variant: Row) => refOf(products.get(refOf(variant["product_id"]))!["category_id"]).replace("category:", "");
/** A variant's price: the product's, plus its own difference. */
const priceOf = (variant: Row): number => cents(String(products.get(refOf(variant["product_id"]))!["price"])) + (variant["price_delta"] === null ? 0 : cents(String(variant["price_delta"])));
const halfUp = (num: number, den: number): number => Math.floor((2 * num + den) / (2 * den));

interface Money {
  lines: { sku: string; product: string; qty: number; line: number; discount: number }[];
  goods: number;
  discount: number;
  net: number;
  shipping: number;
  tax: number;
  gifts: number;
  total: number;
}
/**
 * An order's money from the rows and the prices, as the plan's rules work it
 * out: a line is its price times its pieces; a code takes its percent off each
 * line it applies to, rounded half up; the shipping is the offer's price, or
 * nothing from its "free from" up; the tax is the state's on the goods after
 * reductions, rounded half up; the gift cards come on top.
 */
function moneyOf(order: Row): Money {
  const label = String(order["@label"]);
  const code = rowsOf(main, "order_codes").find((c) => refOf(c["order_id"]) === label)?.["typed"] as string | undefined;
  const rule = code === undefined ? undefined : WORLD.CODES[code];
  const lines = rowsOf(main, "order_lines")
    .filter((l) => refOf(l["order_id"]) === label)
    .map((l) => {
      const variant = variants.get(refOf(l["variant_id"]))!;
      const qty = Number(l["qty"]);
      const line = priceOf(variant) * qty;
      const applies = rule !== undefined && (rule.on === null || rule.on === categoryOf(variant));
      return { sku: String(variant["sku"]), product: String(products.get(refOf(variant["product_id"]))!["name"]), qty, line, discount: applies ? halfUp(line * rule.percent, 100) : 0 };
    });
  const goods = lines.reduce((s, l) => s + l.line, 0);
  const discount = lines.reduce((s, l) => s + l.discount, 0);
  const net = Math.max(0, goods - discount);
  const offer = order["offer_id"] === null ? null : offers.get(refOf(order["offer_id"]))!;
  const freeFrom = offer === null || offer["free_from"] === null ? 0 : cents(String(offer["free_from"]));
  const shipping = offer === null ? 0 : freeFrom > 0 && net >= freeFrom ? 0 : cents(String(offer["price"]));
  const rate = order["region_id"] === null ? 0 : Math.round(Number(regions.get(refOf(order["region_id"]))!["tax_rate"]) * 1000);
  const tax = halfUp(net * rate, 100_000);
  const gifts = rowsOf(main, "gift_lines")
    .filter((g) => refOf(g["order_id"]) === label)
    .reduce((s, g) => s + cents(String(giftAmounts.get(refOf(g["amount_id"]))!["amount"])), 0);
  return { lines, goods, discount, net, shipping, tax, gifts, total: net + shipping + tax + gifts };
}

const worldOrder = (row: Row) => WORLD.ORDERS.find((o) => o.number === row["number"])!;

// ── what a row may write ────────────────────────────────────────────────────

/** Rules that make a column Adminium's: a sample row leaves it to them. */
const DECIDED_RULES = ["copy", "formula", "rollup", "stamp", "sequence", "format", "code", "lookup", "codeLast4", "default"];
/** Columns with no rule of their own that somebody else decides: Offers' answers and the balances a total keeps. */
const DECIDED_ELSEWHERE: Record<string, string[]> = {
  orders: ["discount", "due"],
  order_lines: ["discount", "returnable"],
  payments: ["card_balance_after"],
};
/** The decided columns the sample writes, and why. */
const WRITTEN_ANYWAY: Record<string, Record<string, string>> = {
  // A sample keeps its own numbers off the running series: the number written, the running number spelled null.
  orders: Object.fromEntries([
    ["number_seq", "spelled null, as the docs ask of a gapless series"],
    ["number", "the world's own number, off the series"],
    // History is never stamped (manifest reference, "Stamps"): each moment is written as the stamp would have.
    ...["placed_at", "pay_by", "stock_until", "link_expires", "est_ships_by", "est_from", "est_to", "ships_by", "arrives_from", "arrives_to", "packed_at", "packed_by", "shipped_at", "shipped_by", "cancelled_at", "cancelled_by"].map(
      (c) => [c, "a stamp history never gets"],
    ),
  ]),
  returns: Object.fromEntries([
    ["number_seq", "spelled null, as the docs ask of a gapless series"],
    ["number", "the world's own number, off the series"],
    ...["asked_at", "approved_at", "received_at", "received_by", "refunded_at"].map((c) => [c, "a stamp history never gets"]),
  ]),
  products: { created_at: "never empty: the shop sorts by it, and history is never stamped" },
  customers: { created_at: "their first order's placing", news_since: "the day they said yes" },
  payments: { made_by: "a stamp history never gets: the customer, through the pay page", paid_at: "the moment the pay page wrote (stamped only for a gift card)" },
  payment_refunds: { made_at: "a stamp history never gets", made_by: "a stamp history never gets" },
  restock_requests: { asked_at: "a stamp history never gets" },
  enquiries: { created_at: "a stamp history never gets" },
};

/** Inventory 1.0.33's columns of the tables the shop's file writes, and the ones its ledger keeps (never written). */
const INVENTORY: Record<string, { columns: string[]; kept: string[] }> = {
  places: { columns: ["id", "name", "for_sale", "active", "position", "address"], kept: [] },
  items: {
    columns: ["id", "name", "sku", "barcode", "category_id", "unit_id", "unit", "decimals", "tracks_batches", "when_out", "allow_short", "active", "note", "pack_name", "pack_size", "cost_avg", "supplier_cost", "on_hand", "value", "receipt_id"],
    kept: ["unit_id", "unit", "decimals", "allow_short", "cost_avg", "supplier_cost", "on_hand", "value", "receipt_id"],
  },
  links: { columns: ["id", "source_table", "source_row", "kind", "item_id", "kit_id", "qty", "per", "action", "place_id", "to_place_id", "receipt_id"], kept: ["receipt_id"] },
  receipts: {
    columns: ["id", "number_seq", "number", "po_id", "supplier_id", "place_id", "kind", "status", "order_status", "can_undo", "received_at", "expected_on", "received_on", "late", "days_late", "by", "note", "total", "units", "lines", "unposted", "unreversed", "lines_to_check"],
    kept: ["number_seq", "number", "status", "order_status", "can_undo", "received_at", "expected_on", "received_on", "late", "days_late", "by", "total", "units", "lines", "unposted", "unreversed", "lines_to_check"],
  },
  receipt_lines: {
    columns: ["id", "receipt_id", "po_line_id", "item_id", "item_name", "unit", "place_id", "po_id", "kind", "packs", "pack_size", "qty_typed", "qty", "unit_cost", "po_cost", "supplier_cost", "avg_cost", "cost_used", "cost_guessed", "amount", "batch_code", "expires_on", "status"],
    kept: ["item_name", "unit", "place_id", "po_id", "kind", "pack_size", "qty", "po_cost", "supplier_cost", "avg_cost", "cost_used", "cost_guessed", "amount", "status"],
  },
};
const ADD_ONS_DIR = process.env["ADD_ONS_DIR"] ?? join(ROOT, "..", "add-ons");
const INVENTORY_MANIFEST = join(ADD_ONS_DIR, "packages", "inventory", "manifest.json");

describe("the sample files are what their source writes", () => {
  it("are byte for byte `northline.ts`'s bundles — run `npm run sample` after changing it", () => {
    expect(read("seeds/ecommerce-shop.sample.json") === sampleText()).toBe(true);
    expect(read("seeds/ecommerce-shop.inventory.sample.json") === inventoryText()).toBe(true);
  });

  it("are adminium.sample/1 bundles for the shop, the second for Inventory, both written for a Tuesday", () => {
    expect([main.format, main.app, main.addOn, main.weekAnchor]).toEqual(["adminium.sample/1", "ecommerce-shop", undefined, "tue"]);
    expect([stock.format, stock.app, stock.addOn, stock.weekAnchor]).toEqual(["adminium.sample/1", "ecommerce-shop", "inventory", "tue"]);
    for (const bundle of [main, stock]) for (const t of bundle.tables) expect(t.rows.length, t.ref).toBeGreaterThan(0);
  });

  it("ship no reviews: Forms' reviews are added up by its totals, and nobody may create one", () => {
    expect(main.tables.map((t) => t.ref)).not.toContain("reviews");
    expect(existsSync(join(ROOT, "seeds", "ecommerce-shop.forms.sample.json"))).toBe(false);
  });
});

describe("every row points at a row it can reach", () => {
  const labelsOf = (bundle: Bundle) => bundle.tables.flatMap((t) => t.rows.map((r) => r["@label"]).filter((l): l is string => typeof l === "string"));
  const refsIn = (v: unknown): string[] =>
    v !== null && typeof v === "object" ? (typeof (v as Row)["@ref"] === "string" ? [(v as Row)["@ref"] as string] : Object.values(v as Row).flatMap(refsIn)) : [];

  it("labels each row once, in the characters a label may hold", () => {
    for (const bundle of [main, stock]) {
      const labels = labelsOf(bundle);
      expect(new Set(labels).size, bundle.addOn ?? bundle.app).toBe(labels.length);
      for (const label of labels) expect(label).toMatch(/^[A-Za-z0-9:._-]+$/);
    }
  });

  it("names, in the shop's file, only rows written before it", () => {
    const seen = new Set<string>();
    for (const t of main.tables) {
      for (const row of t.rows) {
        for (const label of refsIn(row)) expect(seen.has(label), `${t.ref} → ${label}`).toBe(true);
        if (typeof row["@label"] === "string") seen.add(row["@label"]);
      }
    }
    // A table that may not go in (`onlyIfEmpty` on the table) is named by nobody.
    const unnamed = main.tables.filter((t) => t.onlyIfEmpty === true).flatMap((t) => labelsOf({ ...main, tables: [t] }));
    expect(unnamed).toEqual([]);
  });

  it("names, in Inventory's file, its own rows written before it or the shop's", () => {
    const shop = new Set(labelsOf(main));
    const seen = new Set<string>();
    for (const t of stock.tables) {
      for (const row of t.rows) {
        for (const label of refsIn(row)) expect(seen.has(label) || shop.has(label), `${t.ref} → ${label}`).toBe(true);
        if (typeof row["@label"] === "string") seen.add(row["@label"]);
      }
    }
    for (const move of stock.moves ?? []) {
      if (move.ref !== undefined) expect(seen.has(move.ref), move.ref).toBe(true);
      else expect(stock.tables.map((t) => t.ref)).toContain(move.table);
    }
  });
});

describe("every row writes columns its table has, and leaves Adminium's to Adminium", () => {
  const tables = new Map(TABLES.map((t) => [t.ref, new Map(t.columns.map((c) => [c.ref, c]))]));
  const decided = (table: string, column: Column) =>
    Object.keys(column.rules ?? {}).some((rule) => DECIDED_RULES.includes(rule)) || (DECIDED_ELSEWHERE[table] ?? []).includes(column.ref);

  it("writes only the shop's own tables and their columns, never the key", () => {
    for (const t of main.tables) {
      const columns = tables.get(t.ref);
      expect(columns, t.ref).toBeDefined();
      for (const row of t.rows) {
        for (const key of Object.keys(row).filter((k) => !k.startsWith("@"))) {
          expect(columns!.has(key), `${t.ref}.${key}`).toBe(true);
          expect(key, t.ref).not.toBe("id");
        }
      }
    }
  });

  it("writes a decided column only where it says why, a running number only as null", () => {
    const written = new Set<string>();
    for (const t of main.tables) {
      for (const row of t.rows) {
        for (const key of Object.keys(row).filter((k) => !k.startsWith("@"))) {
          if (!decided(t.ref, tables.get(t.ref)!.get(key)!)) continue;
          expect(WRITTEN_ANYWAY[t.ref]?.[key], `${t.ref}.${key} is Adminium's`).toBeDefined();
          written.add(`${t.ref}.${key}`);
          if (key === "number_seq") expect(row[key]).toBeNull();
        }
      }
    }
    // Every reason given is used: the list says what the sample writes, no more.
    const listed = Object.entries(WRITTEN_ANYWAY).flatMap(([t, cols]) => Object.keys(cols).map((c) => `${t}.${c}`));
    expect([...written].sort()).toEqual(listed.sort());
  });

  it("names no line's price, total or reduction: Adminium copies the price, Offers decides the reduction", () => {
    for (const line of rowsOf(main, "order_lines")) expect(Object.keys(line).sort()).toEqual(["@label", "order_id", "qty", "variant_id"]);
    for (const order of orders) for (const key of ["goods", "discount", "net", "shipping", "tax", "total", "paid", "due"]) expect(order, key).not.toHaveProperty(key);
  });

  it("writes in Inventory's file only Inventory's columns, none its ledger keeps", () => {
    for (const t of stock.tables) {
      const table = INVENTORY[t.ref];
      expect(table, t.ref).toBeDefined();
      for (const row of t.rows) {
        for (const key of Object.keys(row).filter((k) => !k.startsWith("@"))) {
          expect(table!.columns, `${t.ref}.${key}`).toContain(key);
          expect(table!.kept, `${t.ref}.${key}`).not.toContain(key);
        }
      }
    }
  });

  it.skipIf(!existsSync(INVENTORY_MANIFEST))("holds Inventory's columns to its manifest, where the add-ons repository is beside this one", () => {
    const manifest = JSON.parse(readFileSync(INVENTORY_MANIFEST, "utf8")) as { requiredSchema: { tables: { ref: string; columns: { ref: string; rules?: Record<string, unknown> }[] }[] } };
    for (const [ref, table] of Object.entries(INVENTORY)) {
      const real = manifest.requiredSchema.tables.find((t) => t.ref === ref)!;
      expect(real.columns.map((c) => c.ref), ref).toEqual(table.columns);
      // Every column a rule fills is in the kept list.
      const ruled = real.columns.filter((c) => Object.keys(c.rules ?? {}).some((r) => DECIDED_RULES.includes(r))).map((c) => c.ref);
      for (const column of ruled) expect(table.kept, `${ref}.${column}`).toContain(column);
    }
  });
});

describe("the shop's counts", () => {
  it("holds 20 products, 83 variants, 24 customers, 66 orders and 4 returns", () => {
    const [p, v] = figure("Products / variants").split(" / ").map(Number);
    expect(rowsOf(main, "products").length).toBe(p);
    expect(rowsOf(main, "variants").length).toBe(v);
    expect([p, v]).toEqual([20, 83]);
    expect(rowsOf(main, "customers").length).toBe(24);
    expect(orders.length).toBe(66);
    expect(rowsOf(main, "returns").length).toBe(4);
    expect(rowsOf(main, "regions").length).toBe(51);
  });

  it("numbers its orders NL-1001 to NL-1066 off the running series, so the shop's own next order is NL-1067", () => {
    expect(orders.map((o) => o["number"])).toEqual(Array.from({ length: 66 }, (_, i) => `NL-${String(1001 + i)}`));
    const next = `NL-${String(Math.max(...orders.map((o) => Number(String(o["number"]).slice(3)))) + 1)}`;
    expect(next).toBe("NL-1067");
    expect(figure("Orders in the sample")).toContain(`next is ${next}`);
    expect(rowsOf(main, "settings")[0]).toMatchObject({ ref_prefix: "NL-", first_number: 1067 });
  });

  it("puts each order in the state the designs show", () => {
    const count = (status: string) => orders.filter((o) => o["status"] === status).length;
    expect(count("paying")).toBe(Number(figure("state paying")));
    expect(count("paid")).toBe(Number(figure("state paid")));
    expect(count("packed")).toBe(Number(figure("state packed")));
    expect(count("shipped")).toBe(Number(figure("state shipped")));
    expect(count("sent")).toBe(Number(figure("state gift_sent")));
    expect(count("cancelled")).toBe(Number(figure("state cancelled_unpaid")) + Number(figure("state cancelled_customer")) + Number(figure("state cancelled_staff")));
    expect(orders.filter((o) => o["status"] === "cancelled").map((o) => [o["number"], o["cancel_reason"]])).toEqual([
      ["NL-1022", "customer"],
      ["NL-1040", "address"],
      ["NL-1058", "unpaid"],
    ]);
    expect(count("paid")).toBe(Number(figure("To pack now (paid, not packed)")));
    expect(count("packed")).toBe(Number(figure("Packed, waiting for the 15:00 pickup")));
    expect(count("paying")).toBe(Number(figure("Waiting for payment (paying)")));
    expect(orders.filter((o) => o["kind"] === "gift").map((o) => o["status"])).toEqual(["sent", "sent", "sent"]);
  });

  it("takes returns at each step, one of each", () => {
    const steps = ["asked", "approved", "received", "refunded"].map((s) => rowsOf(main, "returns").filter((r) => r["status"] === s).length);
    expect(steps.join(" / ")).toBe(figure("Returns: asked / approved / received / refunded"));
  });
});

describe("the money, worked out again from the rows", () => {
  it("comes to every order's own total, line by line, and each payment takes it", () => {
    const payments = new Map(rowsOf(main, "payments").map((p) => [refOf(p["order_id"]), p]));
    for (const order of orders) {
      const w = worldOrder(order);
      const m = moneyOf(order);
      const n = String(order["number"]);
      expect([dollars(m.goods), dollars(m.discount), dollars(m.net), dollars(m.shipping), dollars(m.tax), dollars(m.gifts), dollars(m.total)], n).toEqual([w.goods, w.discount, w.net, w.shipping, w.tax, w.giftsTotal, w.total]);
      expect(m.lines.map((l) => [l.sku, l.qty, dollars(l.line), dollars(l.discount)]), n).toEqual(w.lines.map((l) => [l.sku, l.qty, l.line, l.discount]));
      const payment = payments.get(String(order["@label"]));
      expect(payment === undefined, n).toBe(w.paidAt === null);
      if (payment !== undefined) expect(payment["amount"], n).toBe(dollars(m.total));
    }
  });

  it("taxes Washington, California and New York, nowhere else", () => {
    const taxed = rowsOf(main, "regions").filter((r) => Number(r["tax_rate"]) > 0).map((r) => [r["code"], r["tax_rate"]]);
    expect(taxed).toEqual([["CA", 7.25], ["NY", 4], ["WA", 6.5]]);
    expect(taxPercent("OR")).toBe(0);
  });

  it("gives back on each return what the customer paid for its pieces", () => {
    for (const r of rowsOf(main, "returns")) {
      const line = rowsOf(main, "return_lines").find((l) => refOf(l["return_id"]) === r["@label"])!;
      const [, orderNumber, sku] = refOf(line["line_id"]).split(":");
      const order = orders.find((o) => o["number"] === orderNumber)!;
      const bought = moneyOf(order).lines.find((l) => l.sku === sku)!;
      const rate = Math.round(Number(regions.get(refOf(order["region_id"]))!["tax_rate"]) * 1000);
      const refund = halfUp((bought.line - bought.discount) * Number(line["qty"]) * (100_000 + rate), bought.qty * 100_000);
      const world = WORLD.RETURNS.find((x) => x.number === r["number"])!;
      expect(dollars(refund), String(r["number"])).toBe(world.amount);
      // Asked of a shipped order, after it shipped.
      expect(order["status"]).toBe("shipped");
      expect(at(r["asked_at"]) > at(order["shipped_at"])).toBe(true);
    }
  });

  it("sells the dashboard's last 28 days: sales, orders, the average, each week, what went back and the top five", () => {
    const since = shift(NOW, -28 * 1440);
    const counted = orders.filter((o) => ["paid", "packed", "shipped"].includes(String(o["status"])) && at(o["placed_at"]) >= since);
    const sales = counted.reduce((s, o) => s + moneyOf(o).net, 0);
    expect(sales).toBe(money("Sales, last 28 days (goods after discounts, paid orders, before refunds)"));
    expect(counted.length).toBe(Number(figure("Orders, last 28 days (paid)")));
    expect(halfUp(sales, counted.length)).toBe(money("Average order, last 28 days (sales ÷ orders)"));

    // The weeks start on the Tuesday 28 days back, as the chart draws them.
    const start = addDays(TODAY, -28);
    const weeks = [0, 1, 2, 3, 4].map((w) => counted.filter((o) => at(o["placed_at"]).slice(0, 10) >= addDays(start, 7 * w) && at(o["placed_at"]).slice(0, 10) < addDays(start, 7 * (w + 1))).reduce((s, o) => s + moneyOf(o).net, 0));
    for (const [i, total] of weeks.entries()) {
      const name = [...FIGURES.keys()].find((k) => k.startsWith(`sales week ${String(i + 1)} `))!;
      expect(name, `week ${String(i + 1)}`).toContain(new Date(`${addDays(start, 7 * i)}T00:00Z`).toUTCString().slice(5, 11).replace(/^(\d) /, "0$1 "));
      expect(total, name).toBe(money(name));
    }

    const refunded = rowsOf(main, "payment_refunds").filter((r) => at(r["made_at"]) >= since && r["refund_state"] === "done");
    expect(refunded.reduce((s, r) => s + cents(String(r["amount"])), 0)).toBe(money("Refunded, last 28 days (returns + cancellations)"));

    const units = new Map<string, number>();
    for (const o of counted) for (const l of moneyOf(o).lines) units.set(l.product, (units.get(l.product) ?? 0) + l.qty);
    const top = [...units].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5);
    expect(top.map(([name, n]) => `${name} ${String(n)}`).join(", ")).toBe(figure("Top 5 by units, last 28 days"));
  });

  it("sells three gift cards, $175.00 still on them, and takes the codes as often as the designs count", () => {
    const gifts = rowsOf(main, "gift_lines");
    const total = gifts.reduce((s, g) => s + cents(String(giftAmounts.get(refOf(g["amount_id"]))!["amount"])), 0);
    expect(`${String(gifts.length)} / $${dollars(total)}`).toBe(figure("Gift cards: sold online / outstanding balance (not counted in sales)"));
    const typed = (code: string) => rowsOf(main, "order_codes").filter((c) => c["typed"] === code).length;
    expect(`${String(typed("TRAIL15"))} / ${String(typed("WELCOME10"))}`).toBe(figure("Codes used: TRAIL15 / WELCOME10"));
  });

  it("charges Standard to the contiguous states from nothing, free from $100.00, and has no Overnight to Alaska and Hawaii", () => {
    const rows = rowsOf(main, "shipping_offers").map((o) => [refOf(o["service_id"]), refOf(o["zone_id"]), o["price"], o["free_from"]]);
    expect(rows).toEqual([
      ["service:standard", "zone:contiguous", "7.00", "100.00"],
      ["service:standard", "zone:remote", "16.00", null],
      ["service:express", "zone:contiguous", "18.00", null],
      ["service:express", "zone:remote", "34.00", null],
      ["service:overnight", "zone:contiguous", "35.00", null],
    ]);
  });
});

describe("every moment stands where the shop's clock puts it", () => {
  const PASSED = ["placed_at", "paid_at", "packed_at", "shipped_at", "cancelled_at", "created_at", "news_since", "asked_at", "approved_at", "received_at", "refunded_at", "made_at"];

  it("has every moment that has passed behind the adding day, whatever weekday it is added on", () => {
    let checked = 0;
    for (const t of main.tables) {
      for (const row of t.rows) {
        for (const column of PASSED) {
          const v = row[column] as Row | null | undefined;
          if (v === undefined || v === null) continue;
          checked += 1;
          expect(v["@in"], `${t.ref}.${column}`).toBeUndefined();
          if (typeof v["@ago"] === "string") continue;
          // A `@week` moment counts from the week's Tuesday, which may be three days after the adding day.
          if (v["@week"] === true) expect(Number(v["@day"]), `${t.ref}.${column}`).toBeLessThanOrEqual(-4);
          else expect(Number(v["@day"]), `${t.ref}.${column}`).toBeLessThan(0);
        }
      }
    }
    expect(checked).toBeGreaterThan(300);
  });

  it("places the paying order nine minutes ago, waiting 21 minutes more for its payment", () => {
    const paying = orders.find((o) => o["status"] === "paying")!;
    expect([paying["number"], paying["placed_at"], paying["pay_by"]]).toEqual(["NL-1066", { "@ago": "PT9M" }, { "@in": "PT21M" }]);
  });

  it("dates each ships-by by the shipping-day rule, and each arrival by the service's days after it", () => {
    for (const o of WORLD.ORDERS) {
      if (o.paidAt !== null && o.lines.length > 0) expect(shipsBy(o.paidAt), o.number).toBe(o.shipsBy);
      if (o.arrives !== null) {
        const service = WORLD.SERVICES.find((s) => s.id === o.service)!;
        expect([addShipDays(o.shipsBy!, service.days[0]), addShipDays(o.shipsBy!, service.days[1])], o.number).toEqual(o.arrives);
      }
    }
    for (const order of orders.filter((o) => ["paid", "packed", "shipped"].includes(String(o["status"])))) {
      for (const column of ["ships_by", "arrives_from", "arrives_to"]) expect((order[column] as Row)["@week"], `${String(order["number"])}.${column}`).toBe(true);
      expect(at(order["arrives_from"]) >= at(order["ships_by"])).toBe(true);
    }
  });

  it("closes the shop on Labor Day, Monday 7 September, on its weekday", () => {
    expect(rowsOf(main, "closures")).toEqual([{ from_date: { "@day": 20, "@week": true }, to_date: { "@day": 20, "@week": true }, reason: "Labor Day", active: true }]);
  });

  it("ships every parcel at the pickup on a shipping day, after it was paid and packed", () => {
    const payments = new Map(rowsOf(main, "payments").map((p) => [refOf(p["order_id"]), p]));
    for (const order of orders.filter((o) => o["status"] === "shipped")) {
      const shipped = at(order["shipped_at"]);
      expect(shipped.slice(11), String(order["number"])).toBe("15:00");
      expect(shipped.slice(0, 10)).toBe(at(order["ships_by"]));
      expect(at(payments.get(String(order["@label"]))!["paid_at"]) < at(order["packed_at"])).toBe(true);
      expect(at(order["packed_at"]) < shipped).toBe(true);
    }
  });
});

describe("Inventory's file", () => {
  const items = rowsOf(stock, "items");
  const receiptLines = rowsOf(stock, "receipt_lines");

  it("makes a stock item per variant, named as the variant's stock name joins it, linked from that variant one a piece", () => {
    expect(items.length).toBe(83);
    for (const v of WORLD.VARIANTS) {
      const item = items.find((i) => i["@label"] === `item:${v.sku}`)!;
      expect(item).toMatchObject({ name: stockName(v), sku: v.sku });
      expect(rowsOf(stock, "links").filter((l) => refOf(l["source_row"]) === `variant:${v.sku}`)).toEqual([
        { source_table: { "@table": "variants" }, source_row: { "@ref": `variant:${v.sku}` }, kind: "item", item_id: { "@ref": `item:${v.sku}` }, qty: 1, per: "unit", action: "use" },
      ]);
    }
    // An empty part goes with its separator: a tent has neither colour nor size, socks no colour.
    expect(items.find((i) => i["sku"] === "NL-EMB2")!["name"]).toBe("Ember 2 Tent · NL-EMB2");
    expect(items.find((i) => i["sku"] === "NL-SOX-SM")!["name"]).toBe("Hiking Socks, two pairs · S/M · NL-SOX-SM");
    expect(items.find((i) => i["sku"] === "NL-RDG28-SLA")!["name"]).toBe("Ridgeline 28 Daypack · Slate · NL-RDG28-SLA");
  });

  it("brings the world's stock on hand on one opening receipt, which Inventory posts itself", () => {
    const onHand = new Map(receiptLines.map((l) => [refOf(l["item_id"]).replace("item:", ""), Number(l["qty_typed"])]));
    for (const v of WORLD.VARIANTS) expect(onHand.get(v.sku) ?? 0, v.sku).toBe(v.onHand);
    expect(rowsOf(stock, "receipts")).toEqual([{ "@label": "receipt:opening", kind: "opening", place_id: { "@ref": "place:stockroom" }, note: "Opening stock" }]);
    expect(stock.moves).toEqual([
      { ref: "receipt:opening", to: "posting" },
      { table: "receipt_lines", to: "posted" },
      { ref: "receipt:opening", to: "posted" },
    ]);
  });

  it("leaves the designs' low and out variants low and out", () => {
    const onHand = (sku: string) => Number(receiptLines.find((l) => refOf(l["item_id"]) === `item:${sku}`)?.["qty_typed"] ?? 0);
    const [low, out] = figure("Variants low / out").split(" / ").map(Number);
    const showLeftBelow = 5;
    expect(WORLD.VARIANTS.filter((v) => onHand(v.sku) === 0).length).toBe(out);
    expect(WORLD.VARIANTS.filter((v) => onHand(v.sku) > 0 && onHand(v.sku) <= showLeftBelow).length).toBe(low);
  });
});

describe("every row is one the shop could have", () => {
  it("mails nobody: every address is a reserved example one", () => {
    const addresses = [...JSON.stringify([main, stock]).matchAll(/"(?:email|to_email)":\s*"([^"]+)"/g)].map((m) => m[1]!);
    expect(addresses.length).toBeGreaterThan(90);
    for (const address of addresses) expect(address, address).toMatch(/@(?:[a-z]+\.)?example(?:\.com)?$/);
  });

  it("asks for a size again only of a signed-in customer, for a variant that is out", () => {
    for (const r of rowsOf(main, "restock_requests")) {
      const sku = refOf(r["variant_id"]).replace("variant:", "");
      expect(WORLD.VARIANTS.find((v) => v.sku === sku)!.onHand, sku).toBe(0);
      const email = refOf(r["customer_id"]).replace("customer:", "");
      expect(WORLD.CUSTOMERS.find((c) => c.email.startsWith(`${email}@`))!.account, email).toBe(true);
    }
  });
});
