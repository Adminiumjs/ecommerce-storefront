/*
 * Catalog lookups (catalog.ts).
 *
 * Small module, but every screen leans on it, and two of its behaviours are
 * load-bearing rather than defensive:
 *
 *   1. `catName` falling back to "All" is not error handling — "all" is the
 *      store's sentinel slug for the unfiltered listing, so the fallback IS
 *      the feature.
 *   2. `statusMeta` fails closed: anything that is not "in" or "low" reads as
 *      "Sold out". A typo'd status can never advertise stock the shop
 *      does not have.
 */

import { describe, expect, it } from "vitest";
import type { Category, Product, Stock } from "../data/types.ts";
import { catCount, catName, indexBy, statusMeta } from "./catalog.ts";

/* ------------------------------------------------------------------ *
 * Fixtures
 * ------------------------------------------------------------------ */

function product(id: string, cat: string): Product {
  return {
    id,
    title: id,
    price: 10,
    sku: id.toUpperCase(),
    cat,
    status: "in",
    icon: "box",
    tint: "#101010",
    image: "",
    blurb: "",
    desc: "",
    specs: [],
  };
}

const CATS: Category[] = [
  { slug: "gear", name: "Gear", icon: "plug-zap" },
  { slug: "home", name: "Home", icon: "lamp" },
];

const PRODUCTS: Product[] = [
  product("a", "gear"),
  product("b", "gear"),
  product("c", "home"),
];

/* ------------------------------------------------------------------ *
 * indexBy
 * ------------------------------------------------------------------ */

describe("indexing the catalog", () => {
  it("is an empty index for an empty catalog", () => {
    expect(indexBy([])).toEqual({});
  });

  it("keys every product by its id", () => {
    const idx = indexBy(PRODUCTS);
    expect(Object.keys(idx)).toEqual(["a", "b", "c"]);
    expect(idx.b.cat).toBe("gear");
  });

  it("returns the product objects themselves, not copies", () => {
    /* The cart holds product ids and re-reads through the index on every
     * render; sharing identity is what keeps that cheap. */
    expect(indexBy(PRODUCTS).a).toBe(PRODUCTS[0]);
  });

  it("lets a duplicate id shadow the earlier one, silently", () => {
    /* Nothing de-duplicates. Two products with one id means the last wins and
     * the first becomes unreachable — worth knowing when a catalog is stitched
     * together from more than one source. */
    const dupe = product("a", "home");
    const idx = indexBy([PRODUCTS[0], dupe]);
    expect(Object.keys(idx)).toHaveLength(1);
    expect(idx.a).toBe(dupe);
  });

  it("resolves inherited object keys as if they were products", () => {
    /*
     * The index is a plain `{}`, so `index["toString"]` answers with
     * Object.prototype's method rather than undefined. `cartArr` guards with
     * `if (!p) return null`, and a function is truthy, so a cart line for a
     * product id of "toString" or "constructor" would sail past the guard and
     * price at `undefined` — NaN through the whole basket.
     *
     * Unreachable with any plausible catalog, so this is a hardening note
     * rather than a bug report: `Object.create(null)` would close it.
     */
    const idx = indexBy(PRODUCTS);
    expect(idx.a).toBeDefined();
    expect(idx["nope"]).toBeUndefined();
    expect(idx["toString"]).toBeDefined();
    expect(typeof (idx["toString"] as unknown)).toBe("function");
  });
});

/* ------------------------------------------------------------------ *
 * Category names and counts
 * ------------------------------------------------------------------ */

describe("category names", () => {
  it("resolves a known slug to its display name", () => {
    expect(catName(CATS, "gear")).toBe("Gear");
    expect(catName(CATS, "home")).toBe("Home");
  });

  it("names the store's unfiltered sentinel slug 'All'", () => {
    /* The store initialises `cat: "all"` and no category has that slug, so the
     * "unknown slug" branch is the one that renders the default listing
     * heading. It is the happy path, not the error path. */
    expect(catName(CATS, "all")).toBe("All");
  });

  it("falls back to 'All' for an unknown, empty or wrongly-cased slug", () => {
    expect(catName(CATS, "kitchen")).toBe("All");
    expect(catName(CATS, "")).toBe("All");
    expect(catName(CATS, "Gear")).toBe("All"); // slugs are matched exactly
    expect(catName([], "gear")).toBe("All");
  });
});

describe("category counts", () => {
  it("counts the products in a category", () => {
    expect(catCount(PRODUCTS, "gear")).toBe(2);
    expect(catCount(PRODUCTS, "home")).toBe(1);
  });

  it("counts nothing for an unknown slug, an empty slug or an empty catalog", () => {
    /* Notably `catCount(products, "all")` is 0, not the whole catalog — the
     * sentinel slug means "no filter" to the listing, but nothing here. */
    expect(catCount(PRODUCTS, "all")).toBe(0);
    expect(catCount(PRODUCTS, "kitchen")).toBe(0);
    expect(catCount(PRODUCTS, "")).toBe(0);
    expect(catCount([], "gear")).toBe(0);
  });

  it("matches the category slug exactly", () => {
    expect(catCount(PRODUCTS, "Gear")).toBe(0);
    expect(catCount(PRODUCTS, "gear ")).toBe(0);
  });
});

/* ------------------------------------------------------------------ *
 * Status pills
 * ------------------------------------------------------------------ */

describe("the status pill", () => {
  it("labels the three stock states", () => {
    expect(statusMeta("in").label).toBe("In stock");
    expect(statusMeta("low").label).toBe("Low stock");
    expect(statusMeta("out").label).toBe("Sold out");
  });

  it("gives each state its own colour pair", () => {
    const seen = new Set(
      (["in", "low", "out"] as Stock[]).map((s) => {
        const m = statusMeta(s);
        expect(m.col).not.toBe("");
        expect(m.soft).not.toBe("");
        return m.col + "/" + m.soft;
      }),
    );
    expect(seen.size).toBe(3);
  });

  it("presents an unavailable combination exactly like a sold-out one", () => {
    /* "na" (a combination that was never in the variant matrix) and "out" (a
     * real variant with no stock) are different states upstream, but the pill
     * deliberately says the same thing — the shopper cannot buy either. */
    expect(statusMeta("na")).toEqual(statusMeta("out"));
  });

  it("fails closed on an unexpected status", () => {
    /* A future status the pill has never heard of must read "Sold out" rather
     * than "In stock": the shop can under-promise safely, never over-promise. */
    expect(statusMeta("backorder" as Stock).label).toBe("Sold out");
    expect(statusMeta("" as Stock).label).toBe("Sold out");
    expect(statusMeta(undefined as unknown as Stock).label).toBe("Sold out");
  });
});
