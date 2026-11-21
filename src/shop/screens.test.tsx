// @vitest-environment jsdom
/**
 * THE SHOP'S FIRST SCREENS, DRAWN FROM THE SAMPLE WORLD.
 *
 * The whole shop side is mounted (header, footer, drawer, toasts) against the
 * stand-in for Adminium (`testing.ts`, Northline's sample world) and walked as
 * a shopper walks it: home, the listing and its filters, a product's page
 * with its holes and stock words, the basket with a code and a gift card.
 * Every figure asserted is one `src/sample/figures.md` or the comp's frames
 * give for the same world.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../i18n/index.tsx";
import ShopApp from "./ShopApp.tsx";
import { addToBasket, go, resetShop, useCard, useCode, useShop } from "./store.ts";
import { fakePort, type FakePort } from "./testing.ts";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let port: FakePort;
let root: Root | null = null;
let host: HTMLDivElement;

export async function settle(times = 6): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });
  }
}

async function mount(locale = "en-US"): Promise<void> {
  localStorage.setItem("northline-locale", locale);
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

const text = () => document.body.textContent ?? "";
const byText = (tag: string, words: string) => [...document.querySelectorAll<HTMLElement>(tag)].find((el) => el.textContent?.trim() === words) ?? null;
const click = async (el: Element | null) => {
  expect(el).not.toBeNull();
  await act(async () => {
    (el as HTMLElement).click();
  });
  await settle();
};
const visit = async (place: Parameters<typeof go>[0]) => {
  await act(async () => go(place));
  await settle();
};

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
  vi.useRealTimers();
  localStorage.clear();
});

describe("the shop's first screens", () => {
  it("opens on home: new this season, featured, the categories and the shop's promises", async () => {
    await mount();
    expect(document.querySelector("h1")?.textContent).toBe("Gear for wet trails and long days");
    const fresh = document.querySelector("#h-new")!.closest("section")!;
    expect([...fresh.querySelectorAll(".nl-card-name")].map((n) => n.textContent).sort()).toEqual(["Basalt Rain Shell", "Trail Stove"]);
    expect(text()).toContain("Packs & bags");
    expect(text()).toContain("5 products");
    expect(text()).toContain("Free Standard shipping from $100");
    expect(text()).not.toMatch(/TRAIL15|WELCOME10/);
  });

  it("lists twelve of twenty, then loads more; a colour and a size go through one variant", async () => {
    await mount();
    await visit({ view: "shop" });
    expect(text()).toContain("Showing 12 of 20");
    await click(byText("button", "Load more"));
    expect(document.querySelectorAll(".nl-card").length).toBe(20);
    await act(async () => useShop.getState().listing && (await import("./store.ts")).setListing({ colour: "slate", size: "m" }));
    await settle();
    expect([...document.querySelectorAll(".nl-card-name")].map((n) => n.textContent)).toEqual(["Basalt Rain Shell", "Fir Fleece Pullover", "Merino Base Layer Crew", "Camp Slide"]);
  });

  it("searches names and categories, and says when nothing is called that", async () => {
    await mount();
    await visit({ view: "search", q: "rain" });
    expect(text()).toContain("Results for “rain”");
    expect([...document.querySelectorAll(".nl-card-name")].map((n) => n.textContent)).toEqual(["Basalt Rain Shell"]);
    await visit({ view: "search", q: "kayak" });
    expect(text()).toContain("Nothing called that yet");
  });

  it("draws the shell: Ember M has 3 left, Ember XS is not made, Slate XL is sold out", async () => {
    port.setLeft("NL-BSH-EMB-M", 3);
    port.setLeft("NL-BSH-SLA-XL", 0);
    await mount();
    await visit({ view: "product", slug: "basalt-shell" });
    expect(document.querySelector("h1")?.textContent).toBe("Basalt Rain Shell");
    await click(document.querySelector('[aria-label="Ember"]'));
    expect(text()).toContain("Not made in Ember in XS");
    expect(document.querySelector<HTMLButtonElement>('[aria-label="Not made in Ember in XS"]')?.disabled).toBe(true);
    await click(byText(".nl-size-label", "M")?.closest("button") ?? null);
    expect(text()).toContain("Only 3 left");
    expect(text()).toContain("you can have up to 3");
    expect(text()).toContain("NL-BSH-EMB-M");
    await click(document.querySelector('[aria-label="Slate"]'));
    await click(byText(".nl-size-label", "XL")?.closest("button") ?? null);
    expect(text()).toContain("$199.00");
    expect(text()).toContain("Tell me when it’s back");
    expect(text()).toContain("Sign in and we’ll e-mail you once");
  });

  it("prices Priya's basket by a dry run: goods $217.00, free Standard shipping", async () => {
    await mount();
    const s = port.world;
    const shell = s.products.find((p) => p.slug === "basalt-shell")!;
    const beanie = s.products.find((p) => p.slug === "wool-beanie")!;
    await act(async () => {
      addToBasket(shell, s.variants.find((v) => v.sku === "NL-BSH-EMB-M")!, 1, "shirt");
      addToBasket(beanie, s.variants.find((v) => v.sku === "NL-BEA-MOS")!, 1, "shirt");
    });
    await settle();
    await visit({ view: "basket" });
    expect(text()).toContain("$217.00");
    expect(text()).toContain("Free");
    expect(text()).toContain("Total before tax");
    expect(port.calls.at(-1)?.body.values["region_id"]).toBeDefined();
  });

  it("takes TRAIL15 off packs only, and says what Adminium says of other codes", async () => {
    await mount();
    const s = port.world;
    const pack = s.products.find((p) => p.slug === "cascade-45")!;
    await act(async () => addToBasket(pack, s.variants.find((v) => v.sku === "NL-CAS45-SLA-SM")!, 1, "backpack"));
    await settle();
    await visit({ view: "basket" });
    await act(async () => useCode("trail15"));
    await settle();
    expect(text()).toContain("−$32.85");
    expect(text()).toContain("$186.15");
    await act(async () => useCode("WELCOME10"));
    await settle();
    expect(text()).toContain("Sign in to use this code");
    await act(async () => useCode("SUMMIT20"));
    await settle();
    expect(text()).toContain("We don’t know that code.");
  });

  it("shows the free-shipping bar under $100, and a gift card paying", async () => {
    await mount();
    const s = port.world;
    const fleece = s.products.find((p) => p.slug === "fir-fleece")!;
    await act(async () => addToBasket(fleece, s.variants.find((v) => v.sku === "NL-FIR-MOS-M")!, 1, "shirt"));
    await settle();
    await visit({ view: "basket" });
    expect(text()).toContain("Add $11.00 more for free Standard shipping");
    expect(text()).toContain("$96.00");
    await act(async () => void useCard("H8WD3RTM7Q2K"));
    await settle();
    expect(text()).toContain("Gift card ending 7Q2K: $50.00 will be used");
    expect(text()).toContain("To pay");
    expect(text()).toContain("$46.00");
  });
});
