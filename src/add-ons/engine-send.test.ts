/**
 * How a carrier's screens reach Adminium: through this app's one declared
 * sender, to its own shipping routes, and only for a bundle built to ask.
 * Nothing here reaches a network; the request and the bundle are stubs.
 */
import { describe, expect, it, vi } from "vitest";

import { engineSend, loadConnectedAddOns, type ConnectedAddOnDto } from "./connected.ts";
import type { AddOn } from "./host.ts";
import type { EngineCarrier } from "./vendor/host/engine-carrier.ts";
import { register } from "./vendor/shipping-dhl/index.ts";
import { carrierState, engineCarrier, resetRuntime } from "./vendor/shipping-kit/runtime.ts";
import { DEFAULT_SETTINGS, applySettings } from "./vendor/shipping-kit/settings.ts";

const APP = "ecommerce-shop";
const ORIGIN = "https://shop.example.test";
const ROUTE = `/api/v1/apps/${APP}/shipping/bookings`;
const KEY = ["planted", "carrier", "key", "7741"].join("-");

const ok = (body = "{}") => new Response(body, { status: 200 });

function dto(key: string): ConnectedAddOnDto {
  return {
    key,
    name: "A Carrier",
    version: "1.0.0",
    attachments: [{ attachedTo: APP, enabled: true }],
    bundles: [
      {
        path: "dist/client.js",
        url: `/api/v1/add-ons/${key}/bundle/dist/client.js`,
        // sha256 of the empty body the stub answers with.
        integrity: "sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=",
      },
    ],
  };
}

const addOn = (key: string): AddOn => ({
  key,
  name: "A Carrier",
  shortName: "Carrier",
  lineKey: `addon.${key}.line`,
  whatKey: `addon.${key}.what`,
  monogram: "AC",
  category: "delivery",
  connect: "api-key",
  permissions: [],
  settings: [],
  namesCompany: false,
  fills: [],
});

const lister = (key: string): typeof fetch =>
  (async (input: RequestInfo | URL) =>
    String(input).endsWith("/api/v1/add-ons")
      ? new Response(JSON.stringify({ addOns: [dto(key)] }), { status: 200 })
      : new Response(new Uint8Array(0), { status: 200 })) as typeof fetch;

describe("the sender a carrier's client is given", () => {
  it("says who is writing on a write: the session and the CSRF token", async () => {
    const request = vi.fn<typeof fetch>(async () => ok());
    await engineSend(request, ORIGIN, () => "tok-1")(ROUTE, { method: "POST", headers: { accept: "application/json" }, body: "{}" });
    const [url, init] = request.mock.calls[0]!;
    expect(url).toBe(`${ORIGIN}${ROUTE}`);
    expect(init).toMatchObject({ method: "POST", credentials: "same-origin", redirect: "error", body: "{}" });
    expect((init!.headers as Record<string, string>)["x-adminium-csrf"]).toBe("tok-1");
  });

  it("carries the install header the app's request adds, on every call", async () => {
    const seen: Headers[] = [];
    const request = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      seen.push(new Headers(init?.headers));
      return ok();
    }) as typeof fetch;
    const installed: typeof fetch = (input, init) => request(input, { ...init, headers: { ...(init?.headers as Record<string, string>), "x-adminium-install": "inst-9" } });
    const send = engineSend(installed, ORIGIN, () => "tok-1");
    await send(ROUTE, { method: "GET", headers: {} });
    await send(ROUTE, { method: "POST", headers: {}, body: "{}" });
    expect(seen.map((h) => h.get("x-adminium-install"))).toEqual(["inst-9", "inst-9"]);
  });

  it("passes a PUT through as a PUT, with the token, as the 1.0.36 client asks", async () => {
    const request = vi.fn<typeof fetch>(async () => ok());
    await engineSend(request, ORIGIN, () => "tok-1")(`/api/v1/apps/${APP}/shipping/international`, { method: "PUT", headers: {}, body: "{}" });
    const [url, init] = request.mock.calls[0]!;
    expect(url).toBe(`${ORIGIN}/api/v1/apps/${APP}/shipping/international`);
    expect(init).toMatchObject({ method: "PUT", body: "{}" });
    expect((init!.headers as Record<string, string>)["x-adminium-csrf"]).toBe("tok-1");
  });

  it("sends no token on a read", async () => {
    const request = vi.fn<typeof fetch>(async () => ok());
    await engineSend(request, ORIGIN, () => "tok-1")(ROUTE, { method: "GET", headers: {} });
    expect(request.mock.calls[0]![1]!.headers).not.toHaveProperty("x-adminium-csrf");
  });

  it.each([
    ["another site", "https://elsewhere.example/api/v1/apps/x/shipping/quotes"],
    ["a protocol-relative address", "//elsewhere.example/api/v1/apps/x/shipping/quotes"],
    ["another route", "/api/v1/users"],
    ["a route that only starts alike", "/api/v1/apps/x/shipping-secrets"],
    ["a climb out of the route", "/api/v1/apps/x/shipping/../../../users"],
    ["another app's nested path", "/api/v1/apps/x/y/shipping/quotes"],
  ])("refuses %s, and asks nothing", async (_name, path) => {
    const request = vi.fn<typeof fetch>(async () => ok());
    await expect(engineSend(request, ORIGIN, () => "tok-1")(path, { method: "POST", headers: {} })).rejects.toThrow(/shipping routes/);
    expect(request).not.toHaveBeenCalled();
  });

  it("asks once, even when the answer is a failure", async () => {
    const request = vi.fn<typeof fetch>(async () => new Response("{}", { status: 503 }));
    const reply = await engineSend(request, ORIGIN, () => "tok-1")(ROUTE, { method: "POST", headers: {}, body: "{}" });
    expect(reply.status).toBe(503);
    expect(request).toHaveBeenCalledTimes(1);
  });
});

describe("handing the client to a bundle", () => {
  it("gives a bundle built on the kit a client for its own key", async () => {
    const connectEngineCarrier = vi.fn<(client: EngineCarrier) => void>();
    const loaded = await loadConnectedAddOns({
      appKey: APP,
      origin: ORIGIN,
      request: lister("shipping-test"),
      importBundle: async () => ({ register: () => addOn("shipping-test"), connectEngineCarrier }),
    });
    expect(loaded.problems).toEqual([]);
    expect(connectEngineCarrier).toHaveBeenCalledTimes(1);
    expect(connectEngineCarrier.mock.calls[0]![0].addOnKey).toBe("shipping-test");
  });

  it("gives an older bundle nothing, and still registers it", async () => {
    const loaded = await loadConnectedAddOns({
      appKey: APP,
      origin: ORIGIN,
      request: lister("shipping-old"),
      importBundle: async () => ({ register: () => addOn("shipping-old") }),
    });
    expect(loaded.problems).toEqual([]);
    expect(loaded.addOns.map((a) => a.key)).toEqual(["shipping-old"]);
  });

  it("keeps the add-on when taking the client fails", async () => {
    const loaded = await loadConnectedAddOns({
      appKey: APP,
      origin: ORIGIN,
      request: lister("shipping-test"),
      importBundle: async () => ({
        register: () => addOn("shipping-test"),
        connectEngineCarrier: () => {
          throw new Error("no");
        },
      }),
    });
    expect(loaded.addOns).toHaveLength(1);
    expect(loaded.problems.map((p) => p.code)).toEqual(["NO_ENGINE_CLIENT"]);
  });

  it("hands DHL a client and no more: with the demo off it reads as connected, and the engine decides", async () => {
    resetRuntime();
    const addOnValue = register();
    applySettings({ demo_transport: false });
    const loaded = await loadConnectedAddOns({
      appKey: APP,
      origin: ORIGIN,
      request: lister("shipping-dhl"),
      importBundle: async () => ({ register: () => addOnValue, connectEngineCarrier: (await import("./vendor/shipping-dhl/index.ts")).connectEngineCarrier }),
    });
    expect(loaded.problems).toEqual([]);
    expect(engineCarrier()?.addOnKey).toBe("shipping-dhl");
    expect(carrierState()).toBe("connected");
    applySettings({ ...DEFAULT_SETTINGS });
    resetRuntime();
  });

  it("never lets a carrier key through the client it hands in", async () => {
    let client: EngineCarrier | null = null;
    const planted = { api_key: KEY, secret: KEY };
    const request = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/v1/add-ons")) return new Response(JSON.stringify({ addOns: [dto("shipping-test")] }), { status: 200 });
      if (url.includes("/shipping/")) {
        return new Response(JSON.stringify({ error: { code: "CARRIER_REFUSED", message: `said: api_key=${KEY}`, details: planted } }), { status: 422 });
      }
      return new Response(new Uint8Array(0), { status: 200 });
    }) as typeof fetch;
    await loadConnectedAddOns({
      appKey: APP,
      origin: ORIGIN,
      request,
      csrfToken: () => "tok-1",
      importBundle: async () => ({
        register: () => addOn("shipping-test"),
        connectEngineCarrier: (given: EngineCarrier) => {
          client = given;
        },
      }),
    });
    const error = await (client as unknown as EngineCarrier).book({ quoteId: "q", rateId: "r" }).catch((e: unknown) => e as Error);
    expect(JSON.stringify({ ...(error as object), message: (error as Error).message, stack: (error as Error).stack })).not.toContain(KEY);
  });
});
