// @vitest-environment jsdom
/**
 * THE AFTER-ORDER DOOR AT THE WIRE, AND THE RULES THE PAGES KEEP.
 *
 * The real door (`after-door.ts`, over `@adminiumjs/public-client`) is driven
 * against a fetch that answers as Adminium's public API does, and every
 * request is held to its method, its path, its key, its session and its
 * body:
 *
 *   - an order's own link: the code exchanged for a session on the link key
 *     (`POST /public/claim/token`), and the order read through it;
 *   - a cancel: one PATCH with the customer's own reason, through whichever
 *     session reads the order;
 *   - a return: signed in, one POST with its lines as children; through the
 *     link, the return and then each line, two entries;
 *   - a review: the engine's route on the line, read (404 is "reviews off")
 *     and sent with the stars and plain words only;
 *   - signing in: a link and a code asked for the address, the code typed
 *     back.
 *
 * Then the page's own rules: what the fields say before anything is sent,
 * which address the checkout is given (ACC-7), which orders may be
 * cancelled (R3), where "Track it" goes, and how a cancel's refund is worded.
 */
import { beforeEach, describe, expect, it } from "vitest";

import { canCancel, flowErrors, lastAddress, trackingUrl } from "./after.ts";
import { AdminiumShop } from "./door.ts";
import type { OrderRead } from "./after-port.ts";
import { refundWords } from "./screens/AfterOrder.tsx";

interface Sent {
  method: string;
  path: string;
  query: URLSearchParams;
  key: string | null;
  session: string | null;
  body: unknown;
}

const BASE = "https://admin.example";
let sent: Sent[] = [];
let answers: ((req: Sent) => { status: number; body: unknown } | null)[] = [];

function respond(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

const fetchStub: typeof fetch = async (input, init) => {
  const url = new URL(String(input));
  const headers = new Headers(init?.headers as HeadersInit | undefined);
  const req: Sent = {
    method: init?.method ?? "GET",
    path: url.pathname,
    query: url.searchParams,
    key: headers.get("authorization"),
    session: headers.get("x-adminium-public-session"),
    body: init?.body === undefined || init.body === null ? null : JSON.parse(String(init.body)),
  };
  sent.push(req);
  for (const answer of answers) {
    const out = answer(req);
    if (out !== null) return respond(out.status, out.body);
  }
  if (req.method === "GET" && /^\/api\/v1\/public\/records\/[^/]+$/.test(req.path)) return respond(200, { data: [] });
  return respond(404, { error: { code: "PUBLIC_REF_NOT_FOUND", message: "not found" } });
};

const on = (method: string, path: string | RegExp, status: number, body: unknown) =>
  answers.push((req) => (req.method === method && (typeof path === "string" ? req.path === path : path.test(req.path)) ? { status, body } : null));

function shop(): AdminiumShop {
  return new AdminiumShop({ baseUrl: BASE, publishableKey: "pk_shop", publicKeys: { link: "pk_link" } }, { fetch: fetchStub, humanCheck: false });
}

const ORDER = { id: 1065, number: "NL-1065", status: "paid", total: "216.25", paid: "216.25", placed_at: "2026-08-18T17:05:00.000Z" };

beforeEach(() => {
  sessionStorage.clear();
  sent = [];
  answers = [];
});

describe("an order's own link", () => {
  it("exchanges the code for a session on the link key, then reads the order through it", async () => {
    const door = shop().after();
    on("POST", "/api/v1/public/claim/token", 200, { data: { session: "LINKSESSION", expiresAt: Date.now() + 1_800_000, level: "verified" } });
    on("GET", "/api/v1/public/records/ecommerce_shop_orders_claimed", 200, { data: [ORDER] });
    on("GET", "/api/v1/public/records/ecommerce_shop_order_lines_verified_2", 200, { data: [{ id: 10651, order_id: 1065, qty: 1, returnable: 1 }] });
    expect(await door.openShared("Q7M2K9XW4R8TB3NV")).toBe("opened");
    const claim = sent[0]!;
    expect(claim).toMatchObject({ method: "POST", path: "/api/v1/public/claim/token", key: "Bearer pk_link", body: { token: "Q7M2K9XW4R8TB3NV" } });
    expect(door.sharedHeld()).toBe(true);
    const read = await door.readShared();
    expect(read?.order["number"]).toBe("NL-1065");
    expect(read?.lines.map((l) => l["id"])).toEqual([10651]);
    const reads = sent.slice(1);
    expect(reads.every((r) => r.key === "Bearer pk_link" && r.session === "LINKSESSION")).toBe(true);
    expect(reads.map((r) => r.path).sort()).toEqual(
      [
        "/api/v1/public/records/ecommerce_shop_orders_claimed",
        "/api/v1/public/records/ecommerce_shop_order_lines_verified_2",
        "/api/v1/public/records/ecommerce_shop_gift_lines_verified_2",
        "/api/v1/public/records/ecommerce_shop_payments_verified_2",
        "/api/v1/public/records/ecommerce_shop_payment_refunds_verified_2",
        "/api/v1/public/records/ecommerce_shop_returns_verified_3",
      ].sort(),
    );
    // The entries under an order take no filter (Adminium refuses one): they are read whole, the link's session
    // reaching only its own order's rows.
    expect(reads.find((r) => r.path.endsWith("order_lines_verified_2"))!.query.get("where")).toBeNull();
  });

  it("says an unknown code and a stopped link apart", async () => {
    const door = shop().after();
    expect(await door.openShared("UNKNOWNCODE00000")).toBe("unknown");
    answers = [];
    on("POST", "/api/v1/public/claim/token", 410, { error: { code: "LINK_EXPIRED", message: "stopped" } });
    expect(await door.openShared("STOPPEDCODE00000")).toBe("closed");
    expect(door.sharedHeld()).toBe(false);
  });
});

describe("a cancel", () => {
  it("is one PATCH with the customer's own reason, through the link's session", async () => {
    const door = shop().after();
    on("POST", "/api/v1/public/claim/token", 200, { data: { session: "LINKSESSION", expiresAt: Date.now() + 1_800_000, level: "verified" } });
    on("PATCH", "/api/v1/public/records/ecommerce_shop_orders_claimed/1065", 200, { data: { ...ORDER, status: "cancelled", cancel_reason: "customer" } });
    await door.openShared("Q7M2K9XW4R8TB3NV");
    const row = await door.cancel("link", 1065);
    expect(row["status"]).toBe("cancelled");
    expect(sent.at(-1)).toMatchObject({ method: "PATCH", key: "Bearer pk_link", session: "LINKSESSION", body: { values: { status: "cancelled", cancel_reason: "customer" } } });
  });

  it("goes through the customer's own orders when signed in, and a refusal comes back as the shop reads one", async () => {
    const door = shop().after();
    on("PATCH", "/api/v1/public/records/ecommerce_shop_orders_verified/1053", 404, { error: { code: "PUBLIC_REF_NOT_FOUND", message: "not this session's" } });
    await expect(door.cancel("mine", 1053)).rejects.toMatchObject({ refused: { code: "PUBLIC_REF_NOT_FOUND", status: 404 } });
    expect(sent.at(-1)).toMatchObject({ method: "PATCH", path: "/api/v1/public/records/ecommerce_shop_orders_verified/1053", key: "Bearer pk_shop" });
  });
});

describe("a return", () => {
  it("signed in: one POST with its lines as children and its retry key", async () => {
    const door = shop().after();
    on("POST", "/api/v1/public/records/ecommerce_shop_returns_verified_2", 201, { data: { id: 1005, number: "RT-1005", status: "asked", refund_amount: "28.00" }, children: {} });
    const made = await door.askReturn("mine", { orderId: 1053, reason: "faulty", note: " A seam came apart. ", lines: [{ lineId: 10532, qty: 1 }], clientKey: "rk-1" });
    expect(made["number"]).toBe("RT-1005");
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      method: "POST",
      key: "Bearer pk_shop",
      body: { values: { order_id: 1053, reason: "faulty", note: "A seam came apart.", client_key: "rk-1" }, children: { return_lines: [{ values: { line_id: 10532, qty: 1 } }] } },
    });
  });

  it("through the link: the return, then each of its lines, two entries", async () => {
    const door = shop().after();
    on("POST", "/api/v1/public/claim/token", 200, { data: { session: "LINKSESSION", expiresAt: Date.now() + 1_800_000, level: "verified" } });
    on("POST", "/api/v1/public/records/ecommerce_shop_returns_verified_4", 201, { data: { id: 1006, number: "RT-1006", status: "asked" } });
    on("POST", "/api/v1/public/records/ecommerce_shop_return_lines_verified_3", 201, { data: { id: 1 } });
    await door.openShared("Q7M2K9XW4R8TB3NV");
    sent = [];
    await door.askReturn("link", { orderId: 1065, reason: "mind", note: "", lines: [{ lineId: 10651, qty: 1 }, { lineId: 10652, qty: 2 }], clientKey: "rk-2" });
    expect(sent.map((r) => [r.method, r.path, r.key, r.session])).toEqual([
      ["POST", "/api/v1/public/records/ecommerce_shop_returns_verified_4", "Bearer pk_link", "LINKSESSION"],
      ["POST", "/api/v1/public/records/ecommerce_shop_return_lines_verified_3", "Bearer pk_link", "LINKSESSION"],
      ["POST", "/api/v1/public/records/ecommerce_shop_return_lines_verified_3", "Bearer pk_link", "LINKSESSION"],
    ]);
    // A link's entry takes no retry key, and an empty note is not sent.
    expect(sent[0]!.body).toEqual({ values: { order_id: 1065, reason: "mind" } });
    expect(sent.slice(1).map((r) => r.body)).toEqual([{ values: { return_id: 1006, line_id: 10651, qty: 1 } }, { values: { return_id: 1006, line_id: 10652, qty: 2 } }]);
  });
});

describe("a review", () => {
  it("reads the line's state from the engine's route, and sends whole stars and plain words", async () => {
    const door = shop().after();
    on("GET", "/api/v1/public/records/ecommerce_shop_order_lines_verified/10531/review", 200, { data: { open: true, reviewedAt: null, shownName: "Priya R." } });
    on("POST", "/api/v1/public/records/ecommerce_shop_order_lines_verified/10531/review", 201, { data: { reviewedAt: "2026-08-20T10:00:00.000Z" } });
    expect(await door.reviewState("mine", 10531)).toEqual({ open: true, reviewedAt: null });
    expect(await door.sendReview("mine", 10531, { stars: 4, title: "  ", body: " Dry feet. " })).toEqual({ reviewedAt: "2026-08-20T10:00:00.000Z" });
    expect(sent.at(-1)).toMatchObject({ method: "POST", key: "Bearer pk_shop", body: { stars: 4, body: "Dry feet." } });
    expect(sent.at(-1)!.body).not.toHaveProperty("title");
    expect(sent.at(-1)!.body).not.toHaveProperty("name");
  });

  it("reads reviews off when the route answers 404, and says a line already reviewed", async () => {
    const door = shop().after();
    expect(await door.reviewState("mine", 10531)).toBeNull();
    on("POST", /\/review$/, 409, { error: { code: "PUBLIC_REVIEW_DONE", message: "reviewed" } });
    await expect(door.sendReview("mine", 10531, { stars: 5, body: "Again" })).rejects.toMatchObject({ refused: { code: "PUBLIC_REVIEW_DONE", status: 409 } });
  });
});

describe("signing in", () => {
  it("asks a link and a code for the address, and takes the session the code opens", async () => {
    const door = shop().after();
    on("POST", "/api/v1/public/claim/link", 202, { data: { sentTo: "p•••@e•••.com" } });
    on("POST", "/api/v1/public/claim/link/verify", 200, { data: { session: "MYSESSION", expiresAt: Date.now() + 1_800_000 } });
    await door.requestCode(" priya.r@example.com ", "en-US");
    expect(sent[0]).toMatchObject({ method: "POST", path: "/api/v1/public/claim/link", key: "Bearer pk_shop", body: { email: "priya.r@example.com", lang: "en-US" } });
    expect(await door.verifyCode("priya.r@example.com", "482913")).toEqual({ ok: true });
    expect(sent[1]!.body).toEqual({ email: "priya.r@example.com", code: "482913" });
    expect(door.signedIn()).toBe(true);
  });

  it("says a wrong code with the tries left, and a code that ran out", async () => {
    const door = shop().after();
    on("POST", "/api/v1/public/claim/link/verify", 403, { error: { code: "PUBLIC_CODE_WRONG", message: "wrong", params: { triesLeft: 3 } } });
    expect(await door.verifyCode("priya.r@example.com", "111111")).toEqual({ ok: false, reason: "wrong", triesLeft: 3 });
    answers = [];
    on("POST", "/api/v1/public/claim/link/verify", 410, { error: { code: "PUBLIC_CODE_EXPIRED", message: "gone" } });
    expect(await door.verifyCode("priya.r@example.com", "111111")).toEqual({ ok: false, reason: "spent" });
    expect(door.signedIn()).toBe(false);
  });
});

describe("the page's own rules", () => {
  it("says what is missing before anything is sent", () => {
    expect(flowErrors("find", { number: "", email: "" })).toEqual({ number: "empty", email: "empty" });
    expect(flowErrors("find", { number: "nl-1053", email: "priya@" })).toEqual({ email: "shape" });
    expect(flowErrors("signIn", { number: "", email: "priya.r@example.com" })).toEqual({});
  });

  it("gives the checkout the newest proved, not-cancelled order's address (ACC-7)", () => {
    const at = (day: string) => `2026-08-${day}T10:00:00.000Z`;
    const orders = [
      { id: 1, status: "shipped", kind: "goods", customer_proved: true, placed_at: at("01"), ship_name: "Priya Raman", address_line1: "1 Old Rd", city: "Portland", zip: "97214", region_id: 38 },
      { id: 2, status: "cancelled", kind: "goods", customer_proved: true, placed_at: at("10"), ship_name: "Priya Raman", address_line1: "2 Gone St", city: "Portland", zip: "97214", region_id: 38 },
      { id: 3, status: "paid", kind: "goods", customer_proved: false, placed_at: at("12"), ship_name: "Someone", address_line1: "3 Not Hers Ave", city: "Salem", zip: "97301", region_id: 38 },
      { id: 4, status: "paid", kind: "gift", customer_proved: true, placed_at: at("14"), ship_name: null, address_line1: null, city: null, zip: null, region_id: null },
    ];
    expect(lastAddress(orders)).toEqual({ shipName: "Priya Raman", line1: "1 Old Rd", line2: "", city: "Portland", zip: "97214", regionId: 38 });
    expect(lastAddress(orders.slice(1, 3))).toBeNull();
  });

  it("cancels only while paid or waiting for a bank transfer, never while being paid (R3)", () => {
    expect(["paying", "awaiting_transfer", "paid", "packed", "shipped", "sent", "cancelled"].filter((status) => canCancel({ status }))).toEqual(["awaiting_transfer", "paid"]);
  });

  it("sends Track it to the carrier's own page, and nowhere for a carrier it does not know", () => {
    expect(trackingUrl("DHL", "JD0146083586063425")).toBe("https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id=JD0146083586063425");
    expect(trackingUrl("UPS", "1Z999AA10123456784")).toContain("ups.com");
    expect(trackingUrl("Pony Express", "123")).toBeNull();
    expect(trackingUrl("DHL", null)).toBeNull();
  });

  it("words a cancel's refund by how the order was paid (N1b-F5)", () => {
    const read = (paid: string, payments: { method: string; provider?: string; amount: string }[]): OrderRead => ({ via: "link", order: { paid }, lines: [], gifts: [], payments, refunds: [], returns: [], returnLines: [] });
    expect(refundWords(read("216.25", [{ method: "online", provider: "stripe", amount: "216.25" }]))).toBe("after.cancel.card");
    expect(refundWords(read("216.25", [{ method: "online", provider: "paypal", amount: "216.25" }]))).toBe("after.cancel.paypal");
    expect(refundWords(read("216.25", [{ method: "online", amount: "216.25" }]))).toBe("after.cancel.online");
    expect(refundWords(read("50.00", [{ method: "gift_card", amount: "50.00" }]))).toBe("after.cancel.giftCard");
    expect(refundWords(read("217.00", [{ method: "transfer", amount: "217.00" }]))).toBe("after.cancel.transfer");
    expect(refundWords(read("216.25", [{ method: "gift_card", amount: "50.00" }, { method: "online", provider: "stripe", amount: "166.25" }]))).toBe("after.cancel.online");
    expect(refundWords(read("0.00", []))).toBe("after.cancel.nothing");
  });
});
