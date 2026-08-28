// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Connected mode (28-public-surface.md §5.2, 28-T28).
 *
 * ── WHY THIS DRIVES A REAL CLIENT ──────────────────────────────────────────
 * `createPublicClient` takes an injectable `fetch`, so these run the SHIPPED
 * client against canned wire responses rather than a hand-written stub of it.
 * `assertRefs`, the config fetch, the paging and the URL building are therefore
 * under test too — and those are where a connected app actually fails.
 *
 * ── THE GAPS ARE ASSERTED, NOT JUST DESCRIBED ──────────────────────────────
 * This repo's schema cannot express options, variants, reviews, ratings, specs,
 * descriptions or a featured flag, and it has no home for the merchant's tax
 * rate, promo code or shipping prices. Those absences are pinned below so that
 * 28-T36 filling one of them BREAKS a test rather than passing unnoticed.
 */

import { describe, expect, it } from "vitest";

import { createPublicClient } from "@adminiumjs/public-client";

import { loadSnapshot, snapshotSource } from "./adminiumSource.ts";
import { demoSource, isConnected, setDataSource, source } from "./source.ts";

const REFS = ["products", "categories", "productCategories"];

const ROWS: Record<string, unknown[]> = {
  products: [
    { id: 1, title: "Ergo Keyboard K2", sku: "JKY-KB-K2", price: "129.00", image_url: "https://img.test/k2.jpg", status: "active" },
    { id: 2, title: "Draft thing", sku: "JKY-DRAFT", price: "10.00", image_url: null, status: "draft" },
    { id: 3, title: "Wool Beanie", sku: "JKY-BN-MR", price: "24.00", image_url: null, status: "active" },
  ],
  categories: [
    { id: 5, name: "Gear", slug: "gear" },
    { id: 9, name: "Apparel", slug: "apparel" },
  ],
  productCategories: [
    { product_id: 1, category_id: 9 },
    { product_id: 1, category_id: 5 },
    { product_id: 3, category_id: 9 },
  ],
};

interface FakeOptions {
  rows?: Record<string, unknown[]>;
  expose?: (ref: string) => string[];
  /** The scope's per-ref page ceiling — the operator's number, not the app's. */
  limit?: number;
}

/** A server that answers exactly what the scope would, paging included. */
function fakeFetch(overrides: FakeOptions = {}) {
  const rows = overrides.rows ?? ROWS;
  const limit = overrides.limit ?? 500;
  return async (input: RequestInfo | URL): Promise<Response> => {
    const url = new URL(String(input));
    const json = (body: unknown) =>
      new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });

    if (url.pathname.endsWith("/public/config")) {
      const refs: Record<string, unknown> = {};
      for (const ref of REFS) {
        refs[ref] = {
          actions: ["list"],
          expose: overrides.expose?.(ref) ?? Object.keys((rows[ref]?.[0] ?? {}) as object),
          filterable: [], searchable: [], orderable: [], writable: [], limit,
        };
      }
      // `/public/config` is the one route the client unwraps: it reads
      // `body.data`, while `list` reads the body itself.
      return json({
        data: { version: 1, side: "customer", timezone: "UTC", currency: "USD", claim: null, refs },
      });
    }

    const ref = url.pathname.split("/").pop() ?? "";
    const all = rows[ref] ?? [];
    const offset = Number(url.searchParams.get("offset") ?? "0");
    const size = Number(url.searchParams.get("limit") ?? String(all.length));
    return json({ data: all.slice(offset, offset + size) });
  };
}

const clientWith = (fetch: ReturnType<typeof fakeFetch>) =>
  createPublicClient({ baseUrl: "https://api.example.test", publishableKey: "adm_pub_test", fetch });

const snapshot = async (overrides: FakeOptions = {}) =>
  loadSnapshot(clientWith(fakeFetch(overrides))!);

describe("demo mode is the structural default", () => {
  it("builds no client when either variable is absent", () => {
    expect(createPublicClient({ baseUrl: "https://x.test", publishableKey: "" })).toBeNull();
    expect(createPublicClient({ baseUrl: "", publishableKey: "adm_pub_x" })).toBeNull();
    expect(createPublicClient(undefined)).toBeNull();
  });

  it("falls back rather than throwing when the server is unreachable", async () => {
    const client = clientWith(async () => {
      throw new Error("ECONNREFUSED");
    });
    expect(await loadSnapshot(client!)).toBeNull();
  });

  it("falls back when the scope does not expose a column the app reads", async () => {
    expect(await snapshot({ expose: (ref) => (ref === "products" ? ["id"] : ["id"]) })).toBeNull();
  });
});

describe("the catalog", () => {
  it("identifies a product by its SKU, because there is no slug column", async () => {
    const snap = await snapshot();
    expect(snap).not.toBeNull();
    expect(snap!.products.map((p) => p.id)).toEqual(["JKY-KB-K2", "JKY-BN-MR"]);
    expect(snap!.products[0]!.title).toBe("Ergo Keyboard K2");
    // `numeric` arrives as a string and must not reach arithmetic as one.
    expect(snap!.products[0]!.price).toBe(129);
  });

  it("keeps drafts off the shop floor and reads everything else as in stock", async () => {
    const snap = await snapshot();
    // `products.status` is the merchant's word, not the app's: draft and
    // archived are not for sale, and there is no stock level anywhere.
    expect(snap!.products.map((p) => p.sku)).not.toContain("JKY-DRAFT");
    expect(snap!.products.every((p) => p.status === "in")).toBe(true);
  });

  it("files a product under one category, stably, when the join says many", async () => {
    const snap = await snapshot();
    // Two rows for product 1; the lowest category id wins so the product does
    // not move tabs between page loads. WS-I G-2.
    expect(snap!.products[0]!.cat).toBe("gear");
    expect(snap!.products[1]!.cat).toBe("apparel");
  });

  it("derives a stable tint and leaves the icon a neutral default", async () => {
    const first = await snapshot();
    const second = await snapshot();
    expect(first!.products[0]!.tint).toBe(second!.products[0]!.tint);
    expect(first!.products[0]!.tint).toMatch(/^#[0-9a-f]{6}$/);
    // WS-I G-3: neither table has an icon column.
    expect(first!.products[0]!.icon).toBe("package");
    expect(first!.categories[0]!.icon).toBe("tag");
  });

  it("reads every page, not just the first the scope allows", async () => {
    // A scope whose ceiling is one row makes a single-shot read return one
    // product, with a 200 and no warning — a shop missing most of its catalog
    // still looks like a working shop.
    const snap = await snapshot({ limit: 1 });
    expect(snap!.products).toHaveLength(2);
    expect(snap!.categories).toHaveLength(2);
  });
});

describe("what this schema cannot say is left empty, not invented", () => {
  it("ships no description, specs, options, variants or featured flag", async () => {
    const product = (await snapshot())!.products[0]!;
    // WS-I G-5. If 28-T36 gives any of these a column, this test should fail —
    // that is what makes the gap visible rather than forgotten.
    expect(product.blurb).toBe("");
    expect(product.desc).toBe("");
    expect(product.specs).toEqual([]);
    expect(product.options).toBeUndefined();
    expect(product.variants).toBeUndefined();
    expect(product.custom).toBeUndefined();
    expect(product.feat).toBeUndefined();
  });

  it("charges nothing it cannot read, rather than the demo's rates", async () => {
    const shop = snapshotSource((await snapshot())!).getShop();
    // WS-I G-1. The wrong number here is money: the alternative is an 8.5% tax
    // and a working WELCOME10 against a merchant who set neither.
    expect(shop.taxRate).toBe(0);
    expect(shop.promoCode).toBe("");
    expect(shop.promoRate).toBe(0);
    expect(shop.bundleOff).toBe(0);
    expect(shop.ship).toEqual({ standard: 0, express: 0, overnight: 0 });
    expect(shop.brand).toBe("");
    // The one setting real data CAN supply: the hero wears a real photograph.
    expect(shop.heroImage).toBe("https://img.test/k2.jpg");
  });

  it("shows no order history and no customer to an anonymous reader", async () => {
    const connected = snapshotSource((await snapshot())!);
    // G-6, and the reason the read-set does not even ask for those refs: a
    // storefront cannot tell whose orders these are, and listing them would put
    // every customer's name, address and purchases on a public page.
    expect(connected.getOrders()).toEqual([]);
    expect(connected.getCustomer()).toEqual({ name: "", email: "", initials: "" });
    // No reviews table and no ratings table either.
    expect(connected.getRatings()).toEqual({});
    expect(connected.getReviewPool()).toEqual([]);
  });

  it("hands back the same shapes demoSource does", async () => {
    const connected = snapshotSource((await snapshot())!);
    for (const key of Object.keys(demoSource) as (keyof typeof demoSource)[]) {
      expect(typeof connected[key]).toBe("function");
    }
    // Copied on the way out: a caller that mutates what it is given must not
    // reach back into the snapshot.
    connected.getProducts()[0]!.specs.push(["a", "b"]);
    expect(connected.getProducts()[0]!.specs).toEqual([]);
  });
});

describe("the seam", () => {
  it("reports demo mode until a real source is installed", () => {
    expect(isConnected()).toBe(false);
  });

  it("refuses a swap that arrives after the store has read", () => {
    // THE SILENT FAILURE THIS PINS. `state/store.ts` reads at module scope, and
    // so did `main.tsx` — it applied the persisted theme through the store
    // before first paint. Either one evaluates the store before a fetch can
    // resolve, and the app then renders the demo catalog against a configured
    // backend and looks entirely correct.
    source.getProducts();
    expect(() => setDataSource(demoSource)).toThrow(/after the store already read/);
  });
});
