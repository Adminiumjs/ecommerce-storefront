/**
 * The address bar, both ways: every screen's path reads back as that screen,
 * an order's code never rides the path, and the paths a hosted shop is
 * served under are read from where it is mounted.
 */
import { describe, expect, it } from "vitest";

import { PATHS, pathOf, placeOf, relativePath, type Place } from "./route.ts";

describe("the shop's paths", () => {
  it("reads every screen back from the path it writes", () => {
    const places: Place[] = [
      { view: "home" },
      { view: "shop" },
      { view: "shop", slug: "packs" },
      { view: "product", slug: "basalt-shell" },
      ...(Object.keys(PATHS) as (keyof typeof PATHS)[]).map((view) => ({ view })),
    ];
    for (const place of places) {
      const back = placeOf(pathOf(place));
      expect(back.view).toBe(place.view);
      expect(back.slug ?? null).toBe(place.slug ?? null);
    }
  });

  it("carries a search's words in the query", () => {
    expect(pathOf({ view: "search", q: "rain shell" })).toBe("search?q=rain%20shell");
    expect(placeOf("search", "?q=rain%20shell")).toEqual({ view: "search", q: "rain shell" });
  });

  it("opens an order at /o, its code in the fragment and never the path", () => {
    expect(pathOf({ view: "order" })).toBe("o");
    expect(placeOf("o").view).toBe("order");
    expect(placeOf("o/ABCDEF123456").view).toBe("missing");
  });

  it("lands a sign-in link (/c#code) on the sign-in page", () => {
    expect(placeOf("c").view).toBe("signIn");
  });

  it("names anything else missing", () => {
    expect(placeOf("p").view).toBe("missing");
    expect(placeOf("shop/packs/extra").view).toBe("missing");
    expect(placeOf("nowhere").view).toBe("missing");
  });

  it("reads the path after the shop's mount, hosted or on its own domain", () => {
    expect(relativePath("/apps/ecommerce-shop/customer/p/basalt-shell", "/apps/ecommerce-shop/customer/")).toBe("p/basalt-shell");
    expect(relativePath("/apps/ecommerce-shop/northline/customer/basket", "/apps/ecommerce-shop/customer/")).toBe("basket");
    expect(relativePath("/shop/packs", "/")).toBe("shop/packs");
  });
});
