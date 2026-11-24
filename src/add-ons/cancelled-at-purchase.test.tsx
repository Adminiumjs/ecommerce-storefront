/**
 * @vitest-environment jsdom
 *
 * AN ORDER CANCELLED WHILE ITS RATES WERE OPEN. The engine refuses the purchase
 * with `ORDER_CANCELLED` (409), and staff must read that the order was cancelled
 * and no label was bought, never the "we can't tell if this label was bought"
 * flow, which sends them checking for a charge that never happened.
 *
 * Drawn end to end inside the shop: the kit's dispatch flow, on this app's own
 * sender, on the real engine client, against a stubbed engine for a US order.
 * Nothing reaches a network, and no customs form is ever asked for.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { engineSend } from "./connected.ts";
import type { DispatchPayload, PostalAddress } from "./vendor/host/payloads.ts";
import { createEngineCarrier } from "./vendor/host/engine-carrier.ts";
import { configureShippingKit } from "./vendor/shipping-kit/brand.ts";
import { PINNED_NOW } from "./vendor/shipping-kit/clock.ts";
import { translate } from "./vendor/shipping-kit/i18n/t.ts";
import { connectEngineCarrier, resetRuntime } from "./vendor/shipping-kit/runtime.ts";
import { applySettings, DEFAULT_SETTINGS } from "./vendor/shipping-kit/settings.ts";
import { DispatchAction } from "./vendor/shipping-kit/ui/DispatchAction.tsx";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const APP = "ecommerce-shop";
const ORIGIN = "https://shop.example.test";
const CARRIER = "shipping-shippo";
const BASE = `/api/v1/apps/${APP}/shipping`;

const SHOP: PostalAddress = { name: "Northline", lines: ["200 Pine St"], city: "Portland", postcode: "97204", country: "US" };
const ORDER: DispatchPayload["order"] = {
  ref: "NL-1042",
  source: { table: "orders", id: "1042" },
  recipient: { name: "Sam R.", key: "sam" },
  items: [{ id: "l1", key: "tent", label: "Two-person tent", quantity: 1, unitWeightGrams: 2100 }],
  origin: SHOP,
  destination: { name: "Sam R.", lines: ["12 Elm St"], city: "Denver", postcode: "80202", country: "US" },
  parcelWeightGrams: 2400,
};

// What engine 0.3.74 answers, as JSON on the wire. It names no customs fields
// for this shop: it declares none and ships only inside the US.
const ACCESS = { appUpdated: true, carrier: CARRIER, mode: "live", manages: true, mayBook: true, mayCancel: true, mayCustoms: false, mayShipAbroad: false, shipsAbroad: false, pricesHidden: false, booking: "open" };
const QUOTE = {
  quoteId: "q1",
  carrier: CARRIER,
  mode: "live",
  expiresAt: 9_999_999_999_999,
  pricesHidden: false,
  rates: [{ rateId: "r1", code: "usps_ground", service: "Ground Advantage", withinLimit: true, amountDecimal: "9.40", currency: "USD", estimatedDays: 3, tracked: true, carrier: "USPS" }],
};
const CANCELLED = { error: { code: "ORDER_CANCELLED", message: "This order was cancelled, so no label can be bought for it." } };

type Call = { method: string; path: string };

function stubEngine(calls: Call[]): typeof fetch {
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? "GET";
    const path = url.pathname.slice(BASE.length);
    calls.push({ method, path });
    if (method === "GET" && path === "/access") return json(200, { data: ACCESS });
    if (method === "GET" && path === "/bookings") return json(200, { data: { bookings: [], bookable: true, blockedBy: null } });
    if (method === "POST" && path === "/quotes") return json(200, { data: QUOTE });
    if (method === "POST" && path === "/bookings") return json(409, CANCELLED);
    return json(404, { error: { code: "NOT_FOUND", message: `no ${method} ${path} in this stub` } });
  }) as typeof fetch;
}

const words = (key: string) => translate("en-US", `addon.shipping-kit.${key}` as Parameters<typeof translate>[1]);

let root: Root | null = null;
let host: HTMLElement | null = null;

async function settle(): Promise<void> {
  for (let i = 0; i < 8; i += 1) await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
}

async function press(testId: string): Promise<void> {
  await settle();
  const target = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  expect(target, `no [data-testid="${testId}"] on the page`).not.toBeNull();
  await act(async () => {
    target!.click();
  });
  await settle();
}

beforeEach(() => {
  document.documentElement.setAttribute("lang", "en-US");
  applySettings({ ...DEFAULT_SETTINGS, demo_transport: false });
  configureShippingKit({ addOnKey: CARRIER, name: "Shippo", monogram: "SL", idPrefix: "SL" });
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  host?.remove();
  host = null;
  resetRuntime();
  applySettings({ ...DEFAULT_SETTINGS });
});

describe("a purchase refused because the order was cancelled", () => {
  it("says the order was cancelled and no label was bought, not that one may have been", async () => {
    const calls: Call[] = [];
    connectEngineCarrier(createEngineCarrier({ send: engineSend(stubEngine(calls), ORIGIN, () => "tok-1"), appKey: APP, addOnKey: CARRIER }));
    host = document.createElement("div");
    document.body.append(host);
    await act(async () => {
      root = createRoot(host!);
      root.render(<DispatchAction order={ORDER} now={PINNED_NOW} chosen={null} />);
    });

    await press("engine-open");
    await press("engine-get-rates");
    await press("engine-book");

    const page = document.body.textContent ?? "";
    expect(document.querySelector('[data-testid="engine-refused-cancelled"]')).not.toBeNull();
    expect(page).toContain(words("engine.refused.cancelled.title"));
    expect(page).toContain(words("engine.refused.cancelled.next"));
    expect(document.querySelector('[data-testid="engine-unknown"]')).toBeNull();
    expect(page).not.toContain(words("engine.unknown.title"));
    // One purchase, never retried or looked up as if its result were unknown.
    expect(calls.filter((c) => c.method === "POST" && c.path === "/bookings")).toHaveLength(1);
    expect(calls.some((c) => c.path.includes("/check"))).toBe(false);
    // A US order: no customs form, no settings for abroad.
    expect(calls.some((c) => c.path.startsWith("/customs") || c.path === "/international" || c.path === "")).toBe(false);
  });
});
