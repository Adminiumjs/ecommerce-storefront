// @vitest-environment jsdom
/**
 * THE CHECKOUT, ITS REFUSALS, THE PAYING STATES AND THE CONFIRMATION, UNDER AXE.
 *
 * The shop side is mounted whole against the stand-in for Adminium, driven
 * into one state, and swept by axe: WCAG 2.0, 2.1 and 2.2 A/AA and axe's best
 * practices, at every impact. The way back from the pay page is mounted as
 * the order's page shows it (`PayReturn`, its own `main`). Each state runs in
 * English and in Arabic (`dir="rtl"`), and proves it reached its state before
 * axe looks. Selectors, never words, drive it, so both languages walk alike.
 */
import axe from "axe-core";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../i18n/index.tsx";
import { resetCheckout } from "./checkout.ts";
import { setLeave, setOrderReader } from "./pay.ts";
import ShopApp from "./ShopApp.tsx";
import { PayReturn } from "./screens/Checkout.tsx";
import { addToBasket, go, loadShop, resetShop, useCode, useShop } from "./store.ts";
import { fakePort, type FakePort } from "./testing.ts";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Two rules are off because jsdom lays nothing out: colours over a layout, and the size of a box. */
const AXE: axe.RunOptions = {
  runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] },
  rules: {
    "color-contrast": { enabled: false },
    "target-size": { enabled: false },
  },
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

async function render(node: React.ReactNode): Promise<void> {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(<I18nProvider>{node}</I18nProvider>);
  });
  await settle();
}

const $ = (selector: string) => document.querySelector<HTMLElement>(selector);
const $$ = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)];

async function click(selector: string, at = 0): Promise<void> {
  const el = $$(selector)[at];
  if (el === undefined) throw new Error(`nothing to click: ${selector} [${at}]`);
  await act(async () => el.click());
  await settle();
}

async function type(selector: string, value: string): Promise<void> {
  const el = document.querySelector<HTMLInputElement | HTMLSelectElement>(selector);
  if (el === null) throw new Error(`nothing to type into: ${selector}`);
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")!.set!;
  await act(async () => {
    setter.call(el, value);
    el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
  });
  await settle(2);
}

const regionId = (code: string) => String(port.world.regions.find((r) => r.code === code)!.id);
const variant = (sku: string) => port.world.variants.find((v) => v.sku === sku)!;
const product = (slug: string) => port.world.products.find((p) => p.slug === slug)!;

// ── the walks ─────────────────────────────────────────────────────────────

async function toCheckout(pack = false): Promise<void> {
  await act(async () => {
    if (pack) {
      addToBasket(product("cascade-45"), variant("NL-CAS45-SLA-SM"), 1, "backpack");
      useCode("TRAIL15");
      return;
    }
    addToBasket(product("basalt-shell"), variant("NL-BSH-EMB-M"), 1, "shirt");
    addToBasket(product("wool-beanie"), variant("NL-BEA-MOS"), 1, "shirt");
  });
  await settle();
  await act(async () => go({ view: "checkout" }));
  await settle();
}

async function toDelivery(pack = false): Promise<void> {
  await toCheckout(pack);
  await type("#co-email", "priya.r@example.com");
  await click(".nl-co-next");
}

async function filledDelivery(pack = false): Promise<void> {
  await toDelivery(pack);
  await type("#co-ship-name", "Priya Raman");
  await type("#co-line1", "3410 Fir Ave");
  await type("#co-city", "Portland");
  await type("#co-zip", "97214");
  await type("#co-region", regionId("OR"));
  await settle();
}

async function toPay(pack = false): Promise<void> {
  await filledDelivery(pack);
  await click(".nl-co-next");
}

function signIn(): void {
  port.signedIn = true;
  useShop.setState({ customer: { name: "Priya Raman", email: "priya.r@example.com", news: false, address: { shipName: "Priya Raman", line1: "3410 Fir Ave", line2: "", city: "Portland", zip: "97214", regionId: Number(regionId("OR")) } } });
}

/** Paid online, gone to the pay page, and back to the order's address on a fresh page. */
async function back(state: FakePort["payState"]): Promise<void> {
  await toPay();
  await click(".nl-co-pay");
  await act(async () => root?.unmount());
  host?.remove();
  resetCheckout();
  resetShop(port);
  port.payState = state;
  window.history.replaceState(null, "", "/o");
  await act(async () => loadShop());
  await render(<PayReturn />);
  await settle(4);
}

interface Row {
  state: string;
  before?: () => void;
  go: () => Promise<void>;
  shows: string;
}

const STATES: Row[] = [
  { state: "contact, a guest", go: toCheckout, shows: "#co-email" },
  { state: "contact, its error", go: async () => (await toCheckout(), await click(".nl-co-next")), shows: "#co-email[aria-invalid='true']" },
  { state: "contact, signed in", go: async () => (signIn(), await toCheckout()), shows: ".nl-co-identity" },
  { state: "contact, a guest of a bank-transfer shop", before: () => (port.offer = { online: false, test: false }), go: toCheckout, shows: ".nl-co-signin-card" },
  { state: "delivery, priced to Oregon", go: filledDelivery, shows: ".nl-co-speed--on" },
  { state: "delivery, its errors", go: async () => (await toDelivery(), await click(".nl-co-next")), shows: "#co-zip[aria-invalid='true']" },
  { state: "pay, online", go: toPay, shows: ".nl-co-review" },
  { state: "pay, by bank transfer", before: () => (port.offer = { online: false, test: false }), go: async () => (signIn(), await toCheckout(), await click(".nl-co-next"), await click(".nl-co-next")), shows: ".nl-co-review" },
  {
    state: "pay, checking",
    go: async () => {
      await toPay();
      port.hold();
      await act(async () => $(".nl-co-pay")!.click());
    },
    shows: ".nl-co-pay[aria-busy='true']",
  },
  { state: "closed", before: () => ((port.offer = { online: false, test: false }), (port.world.base.settings.transferOn = false)), go: toCheckout, shows: "#co-closed" },
  { state: "refused: prices changed", go: async () => (await toPay(), port.raise("NL-BSH-EMB-M", "10.00"), await click(".nl-co-pay")), shows: "[role='alertdialog'] .nl-co-was" },
  { state: "refused: sold out", go: async () => (await toPay(), port.setLeft("NL-BSH-EMB-M", 0), await click(".nl-co-pay")), shows: "[role='alertdialog'] .nl-co-remove" },
  { state: "refused: too many tries", go: async () => (await toPay(), port.refuseNext({ code: "PUBLIC_RATE_LIMITED", status: 429 }), await click(".nl-co-pay")), shows: "[role='alertdialog']" },
  { state: "refused: a code", go: async () => (await toPay(true), port.refuseNext({ code: "PUBLIC_WRITE_REFUSED", child: "order_codes", index: 0, reason: "ended" }), await click(".nl-co-pay")), shows: "[role='alertdialog'] .nl-co-ref-order" },
  { state: "on the way to the pay page", go: async () => (await toPay(), await click(".nl-co-pay")), shows: ".nl-co-paying" },
  { state: "the confirmation, by bank transfer", before: () => (port.offer = { online: false, test: false }), go: async () => (signIn(), await toCheckout(), await click(".nl-co-next"), await click(".nl-co-next"), await click(".nl-co-pay")), shows: "#co-tr" },
  { state: "back: checking", go: () => back("open"), shows: ".nl-co-paying-spin" },
  { state: "back: the bank confirming", go: () => back("confirming"), shows: ".nl-co-paying-icon--warn" },
  { state: "back: did not finish", go: () => back("failed"), shows: ".nl-co-paying-icon--danger" },
  { state: "back: cancelled unpaid", go: () => back("expired"), shows: ".nl-co-paying-icon" },
  { state: "back: paid, the confirmation", go: () => back("paid"), shows: ".nl-co-thanks" },
];

const LOCALES = [
  ["en-US", "ltr"],
  ["ar-EG", "rtl"],
] as const;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  document.title = "Northline";
  window.history.replaceState(null, "", "/");
  sessionStorage.clear();
  localStorage.clear();
  window.scrollTo = () => {};
  port = fakePort();
  resetShop(port);
  resetCheckout();
  setLeave(() => {});
  setOrderReader(null);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  host?.remove();
  host = null;
  setLeave(null);
  vi.useRealTimers();
});

describe.each(LOCALES)("the checkout in %s", (locale, dir) => {
  it.each(STATES.map((row) => [row.state, row] as const))("%s", async (label, row) => {
    localStorage.setItem("northline-locale", locale);
    row.before?.();
    await render(<ShopApp />);
    await row.go();
    expect(document.documentElement.getAttribute("dir"), label).toBe(dir);
    expect($(row.shows), `${label}: never reached (${row.shows})`).not.toBeNull();
    expect($$("main").length, `${label}: one main`).toBe(1);
    expect($$("h1").length, `${label}: one h1`).toBe(1);

    vi.useRealTimers();
    const result = await axe.run(document, AXE);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    expect(result.passes.length, `${label}: axe examined nothing`).toBeGreaterThan(0);
    expect(
      result.violations.map((v) => `${v.id} (${v.impact ?? "?"}): ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
      `${locale} · ${label}`,
    ).toEqual([]);
  });
});
