/**
 * THE SHOP'S DOOR, AGAINST A FAKE FETCH.
 *
 * What the door sends and how it reads the answer: a product list filtered on
 * the server (the colour and the size through one variant, a search from two
 * characters, the sort, a cursor) and its count; Inventory's words; the dry
 * run and the save through the door open for the kind of order and the way it
 * is paid, carrying the total shown and the retry key; a refusal read as the
 * pages read one.
 */
import { describe, expect, it } from "vitest";

import { AdminiumShop, productFilters } from "./door.ts";
import { isShopError } from "./port.ts";

interface Sent {
  method: string;
  path: string;
  query: URLSearchParams;
  body: unknown;
  headers: Record<string, string>;
}

function door(answer: (sent: Sent) => { status?: number; body: unknown; headers?: Record<string, string> }) {
  const sent: Sent[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input));
    const one: Sent = { method: init.method ?? "GET", path: url.pathname, query: url.searchParams, body: init.body === undefined ? undefined : JSON.parse(String(init.body)), headers: Object.fromEntries(Object.entries((init.headers as Record<string, string>) ?? {}).map(([k, v]) => [k.toLowerCase(), v])) };
    sent.push(one);
    const reply = one.path.endsWith("/public/config") ? { body: { version: "0.3.69", timezone: "America/Los_Angeles", currency: "USD", now: "2026-08-18T18:40:00Z", refs: { ecommerce_shop_products: { limit: 48 } } } } : answer(one);
    return new Response(JSON.stringify(reply.body), { status: reply.status ?? 200, headers: { "content-type": "application/json", ...(reply.headers ?? {}) } });
  }) as typeof fetch;
  const shop = new AdminiumShop({ baseUrl: "https://shop.example", publishableKey: "pk_shop", publicKeys: { link: "pk_link" }, addOns: { forms: { present: true }, offers: { present: true } } }, { fetch: fetchImpl, humanCheck: false });
  return { shop, sent };
}

describe("the product list", () => {
  it("sends the category and the price on the list, the colour and size through one variant", () => {
    expect(productFilters({ categoryId: 2, priceMax: "100", colour: "slate", size: "m" })).toEqual({
      where: {
        and: [
          { column: "category_id", op: "eq", value: 2 },
          { column: "price", op: "lte", value: 100 },
        ],
      },
      via: {
        and: [
          { column: "colour_code", op: "eq", value: "slate" },
          { column: "size_code", op: "eq", value: "m" },
        ],
      },
    });
    expect(productFilters({})).toEqual({ where: null, via: null });
  });

  it("asks a page with its sort, a search from two characters, a cursor, and reads the count", async () => {
    const { shop, sent } = door(() => ({ body: { data: [{ id: 1, name: "Basalt Rain Shell", slug: "basalt-shell", price: "189.00", specs: '[["Fabric","3-layer"]]', featured: 1, new_until: "2026-09-15" }], cursor: { next: "c2" }, count: { rows: 47, atLeast: false } } }));
    const page = await shop.products({ colour: "slate", q: "rain", sort: "low", limit: 12, cursor: "c1" });
    const list = sent.find((s) => s.path.endsWith("/ecommerce_shop_products"))!;
    expect(list.headers["authorization"]).toBe("Bearer pk_shop");
    expect(JSON.parse(list.query.get("via")!)).toEqual({ and: [{ column: "colour_code", op: "eq", value: "slate" }] });
    expect([list.query.get("q"), list.query.get("order"), list.query.get("limit"), list.query.get("cursor"), list.query.get("where")]).toEqual(["rain", "price.asc", "12", "c1", null]);
    expect(page.count).toEqual({ rows: 47, atLeast: false });
    expect(page.next).toBe("c2");
    expect(page.products[0]).toMatchObject({ slug: "basalt-shell", price: "189.00", featured: true, newUntil: "2026-09-15", specs: [["Fabric", "3-layer"]] });
    await shop.products({ q: "r" });
    expect(sent.at(-1)!.query.get("q")).toBeNull();
  });

  it("keeps a product's id when the entry answers with its count", async () => {
    const row = { id: 3, name: "Trailhead Hip Pack", slug: "trailhead-hip", price: 45 };
    const { shop, sent } = door(() => ({ body: { data: [row], page: { limit: 1, offset: 0, total: null }, count: { rows: 1, atLeast: false } } }));
    expect((await shop.productBySlug("trailhead-hip"))?.id).toBe(3);
    expect(JSON.parse(sent.at(-1)!.query.get("where")!)).toEqual({ column: "slug", op: "eq", value: "trailhead-hip" });
  });

  it("reads every page of products with their ids", async () => {
    const { shop, sent } = door((one) => ({
      body: one.query.get("cursor") === null
        ? { data: [{ id: 1 }], cursor: { next: "c2" }, count: { rows: 2, atLeast: false } }
        : { data: [{ id: 2 }], cursor: { next: null }, count: { rows: 2, atLeast: false } },
    }));
    expect((await shop.allProducts()).map((p) => p["id"])).toEqual([1, 2]);
    expect(sent.filter((s) => s.path.endsWith("/ecommerce_shop_products")).map((s) => s.query.get("cursor"))).toEqual([null, "c2"]);
  });

  it("reads a refused filter as a refusal the page can read", async () => {
    const { shop } = door(() => ({ status: 400, body: { error: { code: "PUBLIC_QUERY_REFUSED", message: "no", params: { parameter: "via" } } } }));
    const error = await shop.products({ colour: "slate" }).catch((e: unknown) => e);
    expect(isShopError(error) && [error.refused.code, error.refused.status, error.refused.params["parameter"]]).toEqual(["PUBLIC_QUERY_REFUSED", 400, "via"]);
  });
});

describe("stock words", () => {
  it("asks Inventory's words for up to 60 variants at a time", async () => {
    const { shop, sent } = door((s) => ({ body: { data: (s.query.get("under") ?? "").split(",").map((id) => ({ id, state: id === "3" ? "out" : id === "2" ? "low" : "in", ...(id === "2" ? { left: 3 } : {}) })) } }));
    const words = await shop.stock(Array.from({ length: 70 }, (_, i) => i + 1));
    const reads = sent.filter((s) => s.path.endsWith("/ecommerce_shop_variants_availability"));
    expect(reads.map((r) => r.query.get("under")!.split(",").length)).toEqual([60, 10]);
    expect([words["1"], words["2"], words["3"]]).toEqual([
      { state: "in", left: null },
      { state: "low", left: 3 },
      { state: "out", left: null },
    ]);
  });
});

describe("starting a payment", () => {
  it("answers the human check through the order's own link", async () => {
    const sent: { path: string; proof: string | null; key: string | null }[] = [];
    const fetchImpl = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const path = new URL(String(input)).pathname;
      const headers = new Headers(init.headers);
      sent.push({ path, proof: headers.get("x-adminium-proof"), key: headers.get("authorization") });
      const body = path.endsWith("/public/challenge") ? { data: { id: "c1", salt: "0011", difficulty: 1 } } : { data: { payUrl: "/pay/one" } };
      return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch;
    const shop = new AdminiumShop({ baseUrl: "https://shop.example", publishableKey: "pk_shop", publicKeys: { link: "pk_link" }, addOns: { forms: { present: true }, offers: { present: true } } }, { fetch: fetchImpl });
    expect(await shop.payments().start("link", 7)).toBe("/pay/one");
    const start = sent.find((s) => s.path.endsWith("/public/payments/start"));
    expect(start?.key).toBe("Bearer pk_link");
    expect(start?.proof).toMatch(/^c1\./);
  });
});

describe("pricing and placing an order", () => {
  const body = { values: { region_id: 48, offer_id: 1 }, children: { order_lines: [{ values: { variant_id: 7, qty: 1 } }], order_codes: [{ values: { typed: "TRAIL15" } }] } };

  it("prices through the door for its kind and way of paying", async () => {
    const { shop, sent } = door(() => ({ body: { data: { goods: "219.00", total: "233.24" }, children: { order_lines: [{ data: { sku: "NL-CAS45-SLA" } }] }, applied: [{ line: null, name: "15% off packs & bags", kind: "code", amount: "32.85", typed: true }], postings: [], payment: null, capacity: [], exact: true, nights: [], told: [] } }));
    const quote = await shop.quote("goods", "online", body);
    expect(sent.at(-1)!.path).toBe("/api/v1/public/records/ecommerce_shop_orders_verified_2/dry-run");
    expect(quote.order["total"]).toBe("233.24");
    expect(quote.lines[0]!["sku"]).toBe("NL-CAS45-SLA");
    expect(quote.applied[0]!.amount).toBe("32.85");
    await shop.quote("gift", "transfer", { values: {}, children: { gift_lines: [{ values: { amount_id: 2, to_email: "theo.b@example.com" } }] } });
    expect(sent.at(-1)!.path).toBe("/api/v1/public/records/ecommerce_shop_orders_verified_5/dry-run");
  });

  it("saves once with the total shown and the retry key, and answers the pay link", async () => {
    const { shop, sent } = door(() => ({ status: 201, body: { data: { id: 67, number: "NL-1067", total: "217.00" }, children: {}, replayed: false, link: { key: "link", token: "TOKEN0000000001", session: null, expiresAt: null }, payUrl: "https://pay.example/67", applied: [], told: [], payment: null } }));
    const placed = await shop.place("goods", "online", body, "retry-key-1", "217.00");
    const save = sent.find((s) => s.method === "POST")!;
    expect(save.path).toBe("/api/v1/public/records/ecommerce_shop_orders_verified_2");
    expect(save.body).toMatchObject({ values: { region_id: 48, offer_id: 1, client_key: "retry-key-1" }, expect: { total: "217.00" } });
    expect([placed.order["number"], placed.link?.token, placed.payUrl]).toEqual(["NL-1067", "TOKEN0000000001", "https://pay.example/67"]);
  });

  it("reads a refused code as its child, its place and its reason", async () => {
    const { shop } = door(() => ({ status: 400, body: { error: { code: "PUBLIC_WRITE_REFUSED", message: "refused", params: { child: "order_codes", index: 0, column: "typed", reason: "needs-sign-in" } } } }));
    const error = await shop.quote("goods", "online", body).catch((e: unknown) => e);
    expect(isShopError(error) && [error.refused.child, error.refused.index, error.refused.reason]).toEqual(["order_codes", 0, "needs-sign-in"]);
  });
});

describe("the shop's add-ons", () => {
  it("says which are there from what Adminium serves, and reads a gift card by its code in a header", async () => {
    const { shop, sent } = door(() => ({ body: { data: [{ status: "active", balance: "50.00", expires_on: null }] } }));
    expect(shop.features()).toEqual({ forms: true, offers: true, inventory: false });
    expect(await shop.giftCard("h8wd3rtm7q2k")).toEqual({ balance: "50.00", status: "active", expiresOn: null });
    const read = sent.find((s) => s.path.endsWith("/offers_gift_cards_unlocked"))!;
    expect(read.headers["x-adminium-code"]).toBe("H8WD3RTM7Q2K");
    expect(read.query.toString()).not.toContain("H8WD3RTM7Q2K");
  });
});
