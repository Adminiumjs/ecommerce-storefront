// @vitest-environment jsdom
/**
 * THE SHOP'S FRAME AND ITS FIRST SCREENS, IN EVERY STATE, UNDER AXE.
 *
 * The whole page is swept here, header and footer included (the other
 * screens' suites sweep their own parts): home, the shop and a category, the
 * phone's filter sheet and menu, a search with nothing found, a product's
 * page with a size not made and one sold out, the size guide, the basket
 * drawer and page with a code refused and a gift card used, an empty basket.
 * Each in English and in Arabic (`dir="rtl"`). The table is held to the
 * address bar's screens, so a screen added without a suite fails here.
 */
import axe from "axe-core";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../i18n/index.tsx";
import { PATHS, type ShopView } from "./route.ts";
import ShopApp from "./ShopApp.tsx";
import { addToBasket, choose, go, openDrawer, resetShop, setListing, useCard, useCode, useShop } from "./store.ts";
import { fakePort, type FakePort } from "./testing.ts";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Two rules are off, each because jsdom draws nothing: colours need a laid-out page, target size the boxes a layout gives. */
const AXE: axe.RunOptions = {
  runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] },
  rules: { "color-contrast": { enabled: false }, "target-size": { enabled: false } },
};

let port: FakePort;
let root: Root | null = null;
let host: HTMLDivElement | null = null;

async function settle(times = 6): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });
  }
}

async function mount(locale: string, narrow: boolean): Promise<void> {
  localStorage.setItem("northline-locale", locale);
  window.matchMedia = ((query: string) => ({ matches: narrow && /max-width/.test(query), media: query, addEventListener: () => {}, removeEventListener: () => {} })) as unknown as typeof window.matchMedia;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(
      <I18nProvider>
        <ShopApp />
      </I18nProvider>,
    );
  });
  await settle();
}

const run = async (fn: () => void | Promise<void>) => {
  await act(async () => {
    await fn();
  });
  await settle();
};
const $ = (selector: string) => document.querySelector<HTMLElement>(selector);
const product = (slug: string) => port.world.products.find((p) => p.slug === slug)!;
const variant = (sku: string) => port.world.variants.find((v) => v.sku === sku)!;
const basket = () =>
  run(() => {
    addToBasket(product("cascade-45"), variant("NL-CAS45-SLA-SM"), 1, "backpack");
    addToBasket(product("wool-beanie"), variant("NL-BEA-MOS"), 1, "shirt");
  });

interface Row {
  name: string;
  narrow?: boolean;
  drive: () => Promise<void>;
  proof: string;
}

const ROWS: Row[] = [
  { name: "home", drive: async () => {}, proof: ".nl-hero" },
  { name: "the phone's menu", narrow: true, drive: () => run(() => $('[aria-haspopup="dialog"].nl-narrow')?.click()), proof: ".nl-menu" },
  { name: "shop all", drive: () => run(() => go({ view: "shop" })), proof: ".nl-filters" },
  { name: "a category with filters on", drive: () => run(async () => { go({ view: "shop", slug: "clothing" }); setListing({ colour: "slate", inStock: true }); }), proof: ".nl-card" },
  { name: "the phone's filter sheet", narrow: true, drive: () => run(async () => { go({ view: "shop" }); useShop.setState({ filterSheet: true }); }), proof: ".nl-filters--sheet" },
  { name: "a search with nothing found", drive: () => run(() => go({ view: "search", q: "kayak" })), proof: ".nl-empty" },
  {
    name: "a product: a size not made, one sold out",
    drive: async () => {
      port.setLeft("NL-BSH-SLA-XL", 0);
      await run(() => go({ view: "product", slug: "basalt-shell" }));
      const xl = useShop.getState().product.detail!.options.find((o) => o.code === "xl")!;
      await run(() => choose({ sizeId: xl.id }));
    },
    proof: ".nl-restock",
  },
  { name: "the size guide", drive: () => run(async () => { go({ view: "product", slug: "basalt-shell" }); await vi.advanceTimersByTimeAsync(500); useShop.setState({ guideOpen: true }); }), proof: "#guide-title" },
  { name: "a product with no options and no reviews", drive: () => run(() => go({ view: "product", slug: "ember-2" })), proof: ".nl-buy" },
  { name: "the basket drawer", drive: async () => { await basket(); await run(() => openDrawer(true)); }, proof: ".nl-drawer" },
  {
    name: "the basket page with a code refused and a gift card used",
    drive: async () => {
      await basket();
      await run(() => go({ view: "basket" }));
      await run(() => useCode("WELCOME10"));
      await run(() => void useCard("H8WD3RTM7Q2K"));
    },
    proof: ".nl-summary",
  },
  { name: "an empty basket", drive: () => run(() => go({ view: "basket" })), proof: ".nl-empty" },
];

/** The screens this suite sweeps; every other screen is swept by its own module's suite. */
const MINE: readonly ShopView[] = ["home", "shop", "search", "product", "basket"];
const ELSEWHERE: readonly ShopView[] = [...(Object.keys(PATHS) as ShopView[]).filter((v) => v !== "basket"), "missing"];

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  window.history.replaceState(null, "", "/");
  port = fakePort();
  resetShop(port);
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  host?.remove();
  host = null;
  vi.useRealTimers();
  localStorage.clear();
});

describe("every screen has a suite", () => {
  it("this one sweeps the frame's screens, and the address bar knows no other", () => {
    const all = new Set<ShopView>([...MINE, ...ELSEWHERE]);
    expect([...all].sort()).toEqual([...new Set<ShopView>(["home", "shop", "search", "product", ...(Object.keys(PATHS) as ShopView[]), "missing"])].sort());
  });
});

for (const locale of ["en-US", "ar-EG"]) {
  describe(`the frame under axe (${locale})`, () => {
    for (const row of ROWS) {
      it(row.name, async () => {
        await mount(locale, row.narrow === true);
        await row.drive();
        expect($(row.proof), row.proof).not.toBeNull();
        expect(document.documentElement.getAttribute("dir")).toBe(locale === "ar-EG" ? "rtl" : "ltr");
        vi.useRealTimers();
        const result = await axe.run(document, AXE);
        vi.useFakeTimers({ shouldAdvanceTime: true });
        expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
      });
    }
  });
}
